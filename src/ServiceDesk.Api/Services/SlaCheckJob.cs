using Hangfire;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;

namespace ServiceDesk.Api.Services;

/// <summary>
/// Hangfire recurring job that scans all open tickets for SLA breaches.
/// Runs every 5 minutes. When it finds a breach it:
///   1. Sets SlaBreached = true
///   2. Lets AppDbContext.SaveChangesAsync write the AuditLog row automatically
///   3. Enqueues a notification job for each breached ticket
///
/// Uses SystemDbContextFactory (postgres superuser) because this job needs
/// cross-department visibility — it can't run under a user's JWT claim and
/// a regular servicedesk_app connection would return 0 rows from the RLS policy.
/// </summary>
public class SlaCheckJob
{
    private readonly SystemDbContextFactory _dbFactory;
    private readonly IBackgroundJobClient _jobClient;
    private readonly ILogger<SlaCheckJob> _logger;

    public SlaCheckJob(
        SystemDbContextFactory dbFactory,
        IBackgroundJobClient jobClient,
        ILogger<SlaCheckJob> logger)
    {
        _dbFactory = dbFactory;
        _jobClient = jobClient;
        _logger = logger;
    }

    public async Task RunAsync()
    {
        await using var db = _dbFactory.CreateSystemContext();

        var now = DateTime.UtcNow;

        // Find all tickets that:
        //  - have not been marked breached yet
        //  - are not yet resolved/closed (those are terminal states)
        //  - have passed their SLA deadline
        var breachedTickets = await db.Tickets
            .Where(t => !t.SlaBreached
                     && t.Status != "Resolved"
                     && t.Status != "Closed"
                     && t.SlaDeadline < now)
            .ToListAsync();

        if (breachedTickets.Count == 0)
        {
            _logger.LogDebug("SLA check at {Time}: no new breaches", now);
            return;
        }

        _logger.LogWarning(
            "SLA check at {Time}: {Count} ticket(s) breached their SLA. Marking and notifying.",
            now, breachedTickets.Count);

        foreach (var ticket in breachedTickets)
        {
            var auditLogs = await db.AuditLogs
                .Where(a => a.EntityName == "Ticket" && a.EntityId == ticket.Id.ToString())
                .ToListAsync();

            bool hasBeenResolvedBefore = auditLogs.Any(a => 
            {
                if (string.IsNullOrEmpty(a.NewValues)) return false;
                try
                {
                    var doc = System.Text.Json.JsonDocument.Parse(a.NewValues);
                    if (doc.RootElement.TryGetProperty("Status", out var statusProp))
                    {
                        var status = statusProp.GetString();
                        return status == "Resolved" || status == "Closed";
                    }
                }
                catch { }
                return false;
            });

            if (hasBeenResolvedBefore)
            {
                continue;
            }

            ticket.SlaBreached = true;
        }

        // SaveChangesAsync override in AppDbContext automatically writes
        // one AuditLog row per breached ticket — we don't call it manually.
        await db.SaveChangesAsync();

        // Enqueue a separate Hangfire job for each notification — keeps
        // the SLA scan fast and decouples email failures from the breach marking.
        foreach (var ticket in breachedTickets)
        {
            _jobClient.Enqueue<INotificationService>(
                n => n.SendBreachAlertAsync(ticket.Id));
        }
    }
}
