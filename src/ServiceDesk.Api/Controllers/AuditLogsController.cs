using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.DTOs.CoreDomain;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Admin,Manager")]
[Produces("application/json")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns the full audit history for a specific entity (Ticket or Asset).
    /// Ordered newest-first. Accessible to Admin and Manager roles.
    /// </summary>
    [HttpGet("{entityName}/{entityId:guid}")]
    [ProducesResponseType(typeof(IEnumerable<AuditLogResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEntityHistory(string entityName, Guid entityId)
    {
        var logs = await (from a in _db.AuditLogs
                          where a.EntityName == entityName && a.EntityId == entityId.ToString()
                          join u in _db.Users on a.ChangedByUserId equals u.Id into userGroup
                          from u in userGroup.DefaultIfEmpty()
                          orderby a.Timestamp descending
                          select new { a, UserName = u != null ? u.FullName : a.ChangedByUserId })
            .ToListAsync();

        string? ticketNumber = null;
        if (entityName == "Ticket")
        {
            ticketNumber = await _db.Tickets.Where(t => t.Id == entityId).Select(t => t.TicketNumber).FirstOrDefaultAsync();
        }

        var responses = logs.Select(x => new AuditLogResponse(
            x.a.Id, x.a.EntityName, x.a.EntityId, x.a.Action,
            x.a.ChangedByUserId, x.UserName,
            x.a.Timestamp, x.a.OldValues, x.a.NewValues, ticketNumber
        ));

        return Ok(responses);
    }

    /// <summary>
    /// Returns the most recent audit log entries across all entities, for dashboard use.
    /// Limit defaults to 50; max is 200.
    /// </summary>
    [HttpGet("recent")]
    [ProducesResponseType(typeof(IEnumerable<AuditLogResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecent([FromQuery] int limit = 50)
    {
        limit = Math.Clamp(limit, 1, 200);

        var logs = await (from a in _db.AuditLogs
                          join u in _db.Users on a.ChangedByUserId equals u.Id into userGroup
                          from u in userGroup.DefaultIfEmpty()
                          orderby a.Timestamp descending
                          select new { a, UserName = u != null ? u.FullName : a.ChangedByUserId })
            .Take(limit)
            .ToListAsync();

        var ticketIds = logs.Where(x => x.a.EntityName == "Ticket")
                            .Select(x => Guid.TryParse(x.a.EntityId, out var g) ? (Guid?)g : null)
                            .Where(g => g.HasValue)
                            .Select(g => g.Value)
                            .Distinct()
                            .ToList();

        var ticketNumbers = await _db.Tickets
            .Where(t => ticketIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id.ToString(), t => t.TicketNumber);

        var responses = logs.Select(x => new AuditLogResponse(
            x.a.Id, x.a.EntityName, x.a.EntityId, x.a.Action,
            x.a.ChangedByUserId, x.UserName,
            x.a.Timestamp, x.a.OldValues, x.a.NewValues,
            x.a.EntityName == "Ticket" && ticketNumbers.TryGetValue(x.a.EntityId, out var tn) ? tn : null
        ));

        return Ok(responses);
    }
}
