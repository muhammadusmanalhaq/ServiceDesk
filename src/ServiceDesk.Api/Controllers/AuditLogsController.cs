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
                          select new AuditLogResponse(
                              a.Id, a.EntityName, a.EntityId, a.Action,
                              a.ChangedByUserId,
                              u != null ? u.FullName : a.ChangedByUserId, 
                              a.Timestamp, a.OldValues, a.NewValues))
            .ToListAsync();

        return Ok(logs);
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
                          select new AuditLogResponse(
                              a.Id, a.EntityName, a.EntityId, a.Action,
                              a.ChangedByUserId,
                              u != null ? u.FullName : a.ChangedByUserId, 
                              a.Timestamp, a.OldValues, a.NewValues))
            .Take(limit)
            .ToListAsync();

        return Ok(logs);
    }
}
