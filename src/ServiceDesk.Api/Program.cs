using System.Text;
using Hangfire;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.Models;
using ServiceDesk.Api.Services;
using Azure.Monitor.OpenTelemetry.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ─── Observability ────────────────────────────────────────────────────────────
var otel = builder.Services.AddOpenTelemetry();
if (!string.IsNullOrEmpty(builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]))
{
    otel.UseAzureMonitor();
}

// ─── Database ─────────────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();

// Primary AppDbContext — connected as servicedesk_app (non-superuser) with RLS active.
// IHttpContextAccessor is resolved from DI and injected into the context constructor,
// where it's used by the SaveChangesAsync audit trail override.
builder.Services.AddDbContext<AppDbContext>((serviceProvider, opt) =>
{
    var httpContextAccessor = serviceProvider.GetRequiredService<IHttpContextAccessor>();
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
       .AddInterceptors(new RlsTransactionInterceptor(httpContextAccessor));
});

// System context factory — used ONLY by background jobs and the AuditLogsController.
// Creates AppDbContext instances connected as postgres (superuser), bypassing RLS.
builder.Services.AddSingleton<SystemDbContextFactory>();

// ─── ASP.NET Identity ─────────────────────────────────────────────────────────
builder.Services.AddIdentityCore<ApplicationUser>(opt =>
{
    opt.Password.RequireDigit = true;
    opt.Password.RequiredLength = 8;
    opt.Password.RequireUppercase = false;
    opt.Password.RequireNonAlphanumeric = false;
    opt.User.RequireUniqueEmail = true;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// ─── JWT Authentication ───────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "Jwt:Key is not set. Run: dotnet user-secrets set \"Jwt:Key\" \"<your-secret-key>\"");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// ─── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNextJs", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ─── Application services ─────────────────────────────────────────────────────
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<INotificationService, EmailNotificationService>();

// ─── Hangfire ─────────────────────────────────────────────────────────────────
// Hangfire uses the System connection string (postgres superuser) for its own tables.
// This avoids any RLS interference — Hangfire tables have no RLS policy.
var hangfireConnStr = builder.Configuration.GetConnectionString("System")
    ?? builder.Configuration.GetConnectionString("Default")!;

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(options => options.UseNpgsqlConnection(hangfireConnStr)));

// Add the Hangfire processing server — this is what actually picks up and runs jobs
builder.Services.AddHangfireServer(opt =>
{
    opt.WorkerCount = 2; // Keep low for a single-instance API
    opt.Queues = ["default"];
});

// ─── Controllers + Swagger ───────────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "ServiceDesk API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT access token (without the 'Bearer ' prefix)"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            []
        }
    });
});

var app = builder.Build();

// ─── Seed roles and starter departments ──────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var systemFactory = scope.ServiceProvider.GetRequiredService<SystemDbContextFactory>();
    using var systemDb = systemFactory.CreateSystemContext();
    await systemDb.Database.MigrateAsync();

    await DbSeeder.SeedAsync(scope.ServiceProvider);
}
// ─── Middleware pipeline ──────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ServiceDesk API v1");
    c.RoutePrefix = "swagger";
});

app.UseHttpsRedirection();

// Use CORS before Auth
app.UseCors("AllowNextJs");

// Order matters: Authentication must come before Authorization (and before Hangfire dashboard)
app.UseAuthentication();
app.UseAuthorization();

// ─── Hangfire dashboard ───────────────────────────────────────────────────────
// Locked behind Admin role — an open Hangfire dashboard is a real vulnerability.
// The DashboardAuthFilter checks the JWT claims exactly as our controllers do.
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireDashboardAuthFilter()],
    AppPath = "/swagger" // "Back to site" link goes to Swagger
});

// ─── Register recurring jobs ──────────────────────────────────────────────────
// This is idempotent — safe to call on every startup. Hangfire stores the
// schedule in Postgres, so it survives restarts.
RecurringJob.AddOrUpdate<SlaCheckJob>(
    recurringJobId: "sla-breach-check",
    methodCall: job => job.RunAsync(),
    cronExpression: Cron.MinuteInterval(5),
    options: new RecurringJobOptions
    {
        TimeZone = TimeZoneInfo.Utc
    });

app.MapControllers();

// Health endpoint — needed by CI smoke test in Milestone 9
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .AllowAnonymous();

app.Run();

public partial class Program { }
