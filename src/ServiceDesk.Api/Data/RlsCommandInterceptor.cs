using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace ServiceDesk.Api.Data;

/// <summary>
/// Intercepts database transactions to inject Postgres Row-Level Security (RLS) context.
/// 
/// By hooking into TransactionStartedAsync, we execute SET LOCAL immediately after
/// EF Core starts a transaction (including the implicit transactions for SaveChanges).
/// This perfectly scopes the session variable to the transaction, avoiding connection pool leaks
/// and bypassing EF Core batching/multiple result set issues.
/// </summary>
public class RlsTransactionInterceptor : DbTransactionInterceptor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public RlsTransactionInterceptor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override DbTransaction TransactionStarted(
        DbConnection connection,
        TransactionEndEventData eventData,
        DbTransaction result)
    {
        SetRlsContext(connection, result);
        return base.TransactionStarted(connection, eventData, result);
    }

    public override async ValueTask<DbTransaction> TransactionStartedAsync(
        DbConnection connection,
        TransactionEndEventData eventData,
        DbTransaction result,
        CancellationToken cancellationToken = default)
    {
        await SetRlsContextAsync(connection, result, cancellationToken);
        return await base.TransactionStartedAsync(connection, eventData, result, cancellationToken);
    }

    private void SetRlsContext(DbConnection connection, DbTransaction transaction)
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var deptClaim = user?.FindFirst("department_id")?.Value;
        var roleClaim = user?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value 
                     ?? user?.FindFirst("role")?.Value;

        if (string.IsNullOrEmpty(deptClaim) && string.IsNullOrEmpty(roleClaim)) return;

        var safeDeptClaim = string.IsNullOrEmpty(deptClaim) ? Guid.Empty.ToString() : deptClaim;
        var safeRoleClaim = string.IsNullOrEmpty(roleClaim) ? "" : roleClaim;

        using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = $"SELECT set_config('app.current_department_id', '{safeDeptClaim}', true), set_config('app.current_role', '{safeRoleClaim}', true);";
        cmd.ExecuteNonQuery();
    }

    private async Task SetRlsContextAsync(DbConnection connection, DbTransaction transaction, CancellationToken ct)
    {
        var user = _httpContextAccessor.HttpContext?.User;
        var deptClaim = user?.FindFirst("department_id")?.Value;
        var roleClaim = user?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value 
                     ?? user?.FindFirst("role")?.Value;

        if (string.IsNullOrEmpty(deptClaim) && string.IsNullOrEmpty(roleClaim)) return;

        Console.WriteLine($"[RLS DEBUG] deptClaim: '{deptClaim}', roleClaim: '{roleClaim}'");
        if (user != null)
        {
            foreach (var claim in user.Claims)
            {
                Console.WriteLine($"[RLS DEBUG] Claim: {claim.Type} = {claim.Value}");
            }
        }

        var safeDeptClaim = string.IsNullOrEmpty(deptClaim) ? Guid.Empty.ToString() : deptClaim;
        var safeRoleClaim = string.IsNullOrEmpty(roleClaim) ? "" : roleClaim;

        await using var cmd = connection.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = $"SELECT set_config('app.current_department_id', '{safeDeptClaim}', true), set_config('app.current_role', '{safeRoleClaim}', true);";
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
