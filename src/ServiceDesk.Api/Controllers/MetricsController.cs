using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/metrics")]
[Produces("application/json")]
[Authorize(Roles = "Admin,Manager")]
public class MetricsController : ControllerBase
{
    private readonly AppDbContext _db;

    public MetricsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid CurrentDepartmentId => 
        Guid.TryParse(User.FindFirstValue("department_id"), out var id) ? id : Guid.Empty;

    private bool IsAdmin => User.IsInRole("Admin");

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardMetricsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboardMetrics()
    {
        var deptId = CurrentDepartmentId;
        var isAdmin = IsAdmin;

        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        
        await using var transaction = await _db.Database.BeginTransactionAsync();

        // 1. SLA Trend (last 30 days, grouped by date)
        var ticketsQuery = _db.Tickets.AsQueryable();
        if (!isAdmin) ticketsQuery = ticketsQuery.Where(t => t.DepartmentId == deptId);

        // We use VerifiedAt if available, otherwise CreatedAt for the date grouping of resolved tickets
        var resolvedTickets30Days = await ticketsQuery
            .Where(t => t.Status == "Resolved" || t.Status == "Closed")
            .Where(t => (t.VerifiedAt ?? t.CreatedAt) >= thirtyDaysAgo)
            .Select(t => new { Date = (t.VerifiedAt ?? t.CreatedAt).Date, t.SlaBreached })
            .ToListAsync();

        var slaTrend = resolvedTickets30Days
            .GroupBy(t => t.Date)
            .Select(g => new SlaTrendPoint(
                g.Key.ToString("yyyy-MM-dd"),
                g.Count(t => !t.SlaBreached),
                g.Count(t => t.SlaBreached)
            ))
            .OrderBy(x => x.Date)
            .ToArray();

        // 2. WoW Deltas
        var sevenDaysAgo = now.AddDays(-7);
        var fourteenDaysAgo = now.AddDays(-14);

        // Tickets created in last 7 days vs previous 7 days
        var ticketsCreatedCurrent = await ticketsQuery.CountAsync(t => t.CreatedAt >= sevenDaysAgo);
        var ticketsCreatedPrev = await ticketsQuery.CountAsync(t => t.CreatedAt >= fourteenDaysAgo && t.CreatedAt < sevenDaysAgo);
        var openTicketsDelta = CalculateDelta(ticketsCreatedCurrent, ticketsCreatedPrev);

        // Breaches in last 7 days vs previous 7 days (using CreatedAt for simplicity, or we can use SlaDeadline)
        // We'll use CreatedAt to represent newly breached tickets in that period.
        var breachesCurrent = await ticketsQuery.CountAsync(t => t.SlaBreached && t.CreatedAt >= sevenDaysAgo);
        var breachesPrev = await ticketsQuery.CountAsync(t => t.SlaBreached && t.CreatedAt >= fourteenDaysAgo && t.CreatedAt < sevenDaysAgo);
        var breachedTicketsDelta = CalculateDelta(breachesCurrent, breachesPrev);

        // SLA Compliance WoW
        var resolvedCurrent = resolvedTickets30Days.Where(t => t.Date >= sevenDaysAgo.Date).ToList();
        var resolvedPrev = resolvedTickets30Days.Where(t => t.Date >= fourteenDaysAgo.Date && t.Date < sevenDaysAgo.Date).ToList();
        
        double currentCompliance = resolvedCurrent.Count == 0 ? 0 : (double)resolvedCurrent.Count(t => !t.SlaBreached) / resolvedCurrent.Count * 100;
        double prevCompliance = resolvedPrev.Count == 0 ? 0 : (double)resolvedPrev.Count(t => !t.SlaBreached) / resolvedPrev.Count * 100;
        var slaComplianceDelta = prevCompliance == 0 ? 0 : ((currentCompliance - prevCompliance) / prevCompliance) * 100;

        // Assets Added WoW (via Audit Logs since Asset doesn't have CreatedAt)
        var auditQuery = _db.AuditLogs.Where(a => a.EntityName == "Asset" && a.Action == "Added");
        var assetsCurrent = await auditQuery.CountAsync(a => a.Timestamp >= sevenDaysAgo);
        var assetsPrev = await auditQuery.CountAsync(a => a.Timestamp >= fourteenDaysAgo && a.Timestamp < sevenDaysAgo);
        var activeAssetsDelta = CalculateDelta(assetsCurrent, assetsPrev);

        // Also return the total count of active assets
        var activeAssetsCount = await _db.Assets.CountAsync(a => a.Status != "Retired" && (isAdmin || a.DepartmentId == deptId));
        
        await transaction.CommitAsync();

        var deltas = new StatDeltas(openTicketsDelta, activeAssetsDelta, slaComplianceDelta, breachedTicketsDelta);

        return Ok(new DashboardMetricsResponse(slaTrend, deltas, activeAssetsCount));
    }

    private static double CalculateDelta(int current, int previous)
    {
        // Suppress delta (return 0) if the baseline is too small to be meaningful
        if (previous < 5) return 0;
        return ((double)(current - previous) / previous) * 100;
    }
}

public record DashboardMetricsResponse(SlaTrendPoint[] SlaTrend, StatDeltas Deltas, int TotalActiveAssets);
public record SlaTrendPoint(string Date, int Compliant, int Breached);
public record StatDeltas(double OpenTickets, double ActiveAssets, double SlaCompliance, double BreachedTickets);
