using Microsoft.EntityFrameworkCore;

namespace ServiceDesk.Api.Data;

/// <summary>
/// Creates AppDbContext instances connected as the Postgres superuser.
///
/// Background jobs (e.g. the SLA breach scanner) need to query tickets across
/// ALL departments — they have no user context, so RLS would filter everything
/// to zero rows. Connecting as a Postgres superuser bypasses RLS entirely, even
/// when FORCE ROW LEVEL SECURITY is set on the table.
///
/// This factory is ONLY for background jobs. HTTP-scoped operations always use
/// the standard scoped AppDbContext (connected as servicedesk_app with RLS active).
/// </summary>
public class SystemDbContextFactory
{
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SystemDbContextFactory(IConfiguration configuration, IHttpContextAccessor httpContextAccessor)
    {
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
    }

    public AppDbContext CreateSystemContext()
    {
        var connStr = _configuration.GetConnectionString("System")
            ?? throw new InvalidOperationException(
                "ConnectionStrings:System is not configured. " +
                "Add it via user-secrets: dotnet user-secrets set \"ConnectionStrings:System\" \"Host=localhost;Database=servicedesk;Username=postgres;Password=adminpass\"");

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connStr)
            // No RlsTransactionInterceptor — superuser connection bypasses RLS natively.
            .Options;

        return new AppDbContext(options, _httpContextAccessor);
    }
}
