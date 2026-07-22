using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// ─── Services ────────────────────────────────────────────────────────────────

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "ServiceDesk API", Version = "v1" });
});

// EF Core + Postgres — connection string comes from user-secrets locally,
// Key Vault in production (Milestone 8). Never hardcoded here.
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

// ─── Middleware pipeline ──────────────────────────────────────────────────────

// Swagger available in Development — will be locked down or removed for production
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ServiceDesk API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

// ─── Health endpoint (needed for smoke tests in Milestone 9) ─────────────────
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
   .WithTags("Health")
   .AllowAnonymous();

app.Run();
