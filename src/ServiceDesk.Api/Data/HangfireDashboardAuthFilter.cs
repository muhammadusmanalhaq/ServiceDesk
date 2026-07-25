using Hangfire.Dashboard;

namespace ServiceDesk.Api.Data;

/// <summary>
/// Restricts the Hangfire dashboard to authenticated Admin users only.
/// An open Hangfire dashboard is a real, common misconfiguration — it exposes
/// job queues, job arguments (which can contain sensitive data), and the ability
/// to trigger/cancel jobs on demand.
/// </summary>
public class HangfireDashboardAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // Must be authenticated AND carry the Admin role claim.
        // A valid JWT without the Admin role will be denied.
        return httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.IsInRole("Admin");
    }
}
