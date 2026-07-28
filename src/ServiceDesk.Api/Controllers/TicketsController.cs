using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.DTOs.CoreDomain;
using ServiceDesk.Api.Models;
using ServiceDesk.Api.Hubs;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/tickets")]
[Authorize]
[Produces("application/json")]
public class TicketsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly IHubContext<TicketHub> _hub;

    public TicketsController(AppDbContext db, IMemoryCache cache, IHubContext<TicketHub> hub)
    {
        _db = db;
        _cache = cache;
        _hub = hub;
    }

    private Guid CurrentDepartmentId =>
        Guid.Parse(User.FindFirstValue("department_id") ?? Guid.Empty.ToString());

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

    private string CurrentRole =>
        User.FindFirstValue(ClaimTypes.Role)
        ?? User.FindFirstValue("role")
        ?? "";

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static TicketResponse ToResponse(Ticket t) => new(
        t.Id, t.Title, t.Description, t.Status, t.Priority,
        t.AssetId, t.DepartmentId, t.AssignedToUserId,
        t.ClaimedByUserId, t.ClaimedAt,
        t.VerifiedByUserId, t.VerifiedAt, t.ResolutionNote,
        t.SlaDeadline, t.SlaBreached, t.CreatedAt,
        t.Attachments?.Select(a => new AttachmentResponse(a.Id, a.BlobPath, a.FileName, a.UploadedByUserId, a.UploadedAt)).ToList());

    // ── CRUD ─────────────────────────────────────────────────────────────────

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TicketResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var cacheKey = $"Tickets_{CurrentDepartmentId}";
        if (_cache.TryGetValue(cacheKey, out IEnumerable<TicketResponse>? cachedTickets))
        {
            return Ok(cachedTickets);
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();

        var tickets = await _db.Tickets.Include(t => t.Attachments).AsNoTracking().ToListAsync();

        await transaction.CommitAsync();
        
        var response = tickets.Select(ToResponse).ToList();
        
        _cache.Set(cacheKey, response, TimeSpan.FromSeconds(30));
        
        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        var ticket = await _db.Tickets.Include(t => t.Attachments).AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);

        await transaction.CommitAsync();

        if (ticket == null) return NotFound();

        return Ok(ToResponse(ticket));
    }

    [HttpPost]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(CreateTicketRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        // Verify the asset exists and belongs to the same department (RLS implicitly enforces this)
        var assetExists = await _db.Assets.AnyAsync(a => a.Id == request.AssetId);
        if (!assetExists)
        {
            await transaction.CommitAsync();
            return BadRequest(new { message = "Invalid Asset ID or Asset does not belong to your department." });
        }

        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            Status = "Open",
            Priority = request.Priority,
            AssetId = request.AssetId,
            DepartmentId = CurrentDepartmentId,
            CreatedAt = DateTime.UtcNow,
            // SLA: 4 hours from now for Critical, 24 for others (simplified logic)
            SlaDeadline = DateTime.UtcNow.AddHours(request.Priority == "Critical" ? 4 : 24),
            SlaBreached = false
        };

        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        _cache.Remove($"Tickets_{CurrentDepartmentId}");
        
        var response = ToResponse(ticket);
        await _hub.Clients.Group(CurrentDepartmentId.ToString()).SendAsync("TicketCreated", response);

        return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, response);
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Admin,Manager,Agent")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateTicketStatusRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        var ticket = await _db.Tickets.Include(t => t.Attachments).FirstOrDefaultAsync(t => t.Id == id);
        if (ticket == null)
        {
            await transaction.CommitAsync();
            return NotFound();
        }

        ticket.Status = request.Status;

        // Check if resolved before deadline
        if (request.Status == "Resolved" || request.Status == "Closed")
        {
            ticket.SlaBreached = DateTime.UtcNow > ticket.SlaDeadline;
        }

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        _cache.Remove($"Tickets_{CurrentDepartmentId}");

        var response = ToResponse(ticket);
        await _hub.Clients.Group(CurrentDepartmentId.ToString()).SendAsync("TicketUpdated", response);

        return Ok(response);
    }

    [HttpPost("{id:guid}/assign")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Assign(Guid id, AssignTicketRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        var ticket = await _db.Tickets.Include(t => t.Attachments).FirstOrDefaultAsync(t => t.Id == id);
        if (ticket == null)
        {
            await transaction.CommitAsync();
            return NotFound();
        }

        // Normally we'd verify the assigned user exists and is in the same department
        // For simplicity in this milestone, we assign the ID directly
        ticket.AssignedToUserId = request.UserId;
        ticket.Status = "InProgress";

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        _cache.Remove($"Tickets_{CurrentDepartmentId}");

        var response = ToResponse(ticket);
        await _hub.Clients.Group(CurrentDepartmentId.ToString()).SendAsync("TicketUpdated", response);

        return Ok(response);
    }

    // ── Claim / Verify workflow ───────────────────────────────────────────────

    /// <summary>
    /// Agent claims that they have resolved a ticket.
    /// Transitions the ticket to PendingVerification and notifies the department manager/admin.
    /// </summary>
    [HttpPost("{id:guid}/claim")]
    [Authorize(Roles = "Agent")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Claim(Guid id, ClaimTicketRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        // RLS ensures the ticket is in the Agent's department; if not, FindAsync returns null → 404.
        var ticket = await _db.Tickets.Include(t => t.Attachments).FirstOrDefaultAsync(t => t.Id == id);
        if (ticket == null)
        {
            await transaction.CommitAsync();
            return NotFound();
        }

        // Only tickets that are Open or InProgress can be claimed
        if (ticket.Status != "Open" && ticket.Status != "InProgress")
        {
            await transaction.CommitAsync();
            return Conflict(new { message = $"Ticket cannot be claimed from status '{ticket.Status}'." });
        }

        var now = DateTime.UtcNow;
        ticket.Status = "PendingVerification";
        ticket.ClaimedByUserId = CurrentUserId;
        ticket.ClaimedAt = now;
        ticket.ResolutionNote = request.ResolutionNote;

        // Write an in-app notification for every Admin/Manager in the department so they
        // know a claim is awaiting review. We fetch their IDs without RLS (Notifications
        // table has no policy), using the current scoped context which already has the
        // department_id GUC set — the AspNetUsers query below uses no RLS, that's fine.
        var managersAndAdmins = await _db.Users
            .Where(u => u.DepartmentId == CurrentDepartmentId)
            .Join(_db.UserRoles, u => u.Id, ur => ur.UserId, (u, ur) => new { u, ur })
            .Join(_db.Roles, x => x.ur.RoleId, r => r.Id, (x, r) => new { x.u, RoleName = r.Name })
            .Where(x => x.RoleName == "Admin" || x.RoleName == "Manager")
            .Select(x => x.u.Id)
            .Distinct()
            .ToListAsync();

        var notifications = managersAndAdmins.Select(userId => new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = "TicketClaimed",
            Message = $"Ticket \"{ticket.Title}\" has been claimed by agent and is pending your verification.",
            TicketId = ticket.Id,
            CreatedAt = now
        });
        _db.Notifications.AddRange(notifications);

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        _cache.Remove($"Tickets_{CurrentDepartmentId}");

        var response = ToResponse(ticket);
        await _hub.Clients.Group(CurrentDepartmentId.ToString()).SendAsync("TicketUpdated", response);

        return Ok(response);
    }

    /// <summary>
    /// Admin or Manager verifies (accepts or rejects) an agent's claim.
    /// 
    /// Accept → Resolved. Asset status flips to Active ONLY if no other open tickets reference it
    ///          (i.e., there is no concurrent unresolved work on the same asset).
    /// Reject → InProgress. The claim fields are cleared; the agent can re-claim once they fix the issue.
    ///
    /// Asset multi-ticket rule rationale: if Ticket A and Ticket B both reference the same Asset
    /// and Ticket A is resolved first, the asset should NOT flip to Active while Ticket B is still
    /// open — that would inaccurately signal the asset is healthy. The asset only returns to Active
    /// when no open tickets remain for it.
    /// </summary>
    [HttpPost("{id:guid}/verify")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Verify(Guid id, VerifyTicketRequest request)
    {
        // Validation: rejection requires a note
        if (!request.Accept && string.IsNullOrWhiteSpace(request.ResolutionNote))
        {
            return BadRequest(new { message = "A ResolutionNote is required when rejecting a claim." });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();

        // RLS ensures the ticket is in the verifier's department. If not → 404.
        var ticket = await _db.Tickets.Include(t => t.Attachments).FirstOrDefaultAsync(t => t.Id == id);
        if (ticket == null)
        {
            await transaction.CommitAsync();
            return NotFound();
        }

        // Only PendingVerification tickets can be verified
        if (ticket.Status != "PendingVerification")
        {
            await transaction.CommitAsync();
            return Conflict(new { message = $"Ticket is not pending verification (current status: '{ticket.Status}')." });
        }

        var now = DateTime.UtcNow;
        ticket.VerifiedByUserId = CurrentUserId;
        ticket.VerifiedAt = now;

        string notificationType;
        string notificationMessage;

        if (request.Accept)
        {
            ticket.Status = "Resolved";
            ticket.ResolutionNote = request.ResolutionNote ?? ticket.ResolutionNote;
            ticket.SlaBreached = DateTime.UtcNow > ticket.SlaDeadline;

            // Asset status rule: only flip to Active if this was the LAST open ticket on the asset.
            // "Open" here means not Resolved or Closed — PendingVerification still counts as open.
            var otherOpenTickets = await _db.Tickets
                .Where(t => t.AssetId == ticket.AssetId
                         && t.Id != ticket.Id
                         && t.Status != "Resolved"
                         && t.Status != "Closed")
                .CountAsync();

            if (otherOpenTickets == 0)
            {
                var asset = await _db.Assets.FindAsync(ticket.AssetId);
                if (asset != null)
                    asset.Status = "Active";
            }

            notificationType = "ClaimAccepted";
            notificationMessage = $"Your resolution claim for ticket \"{ticket.Title}\" was accepted.";
        }
        else
        {
            // Rejection: send the ticket back to InProgress, clear claim fields
            ticket.Status = "InProgress";
            ticket.ResolutionNote = request.ResolutionNote;
            ticket.ClaimedByUserId = null;
            ticket.ClaimedAt = null;
            ticket.VerifiedByUserId = null;
            ticket.VerifiedAt = null;

            notificationType = "ClaimRejected";
            notificationMessage = $"Your resolution claim for ticket \"{ticket.Title}\" was rejected. Reason: {request.ResolutionNote}";
        }

        // Notify the claiming agent
        if (!string.IsNullOrEmpty(ticket.ClaimedByUserId) || !string.IsNullOrEmpty(ticket.AssignedToUserId))
        {
            var recipientId = ticket.ClaimedByUserId ?? ticket.AssignedToUserId!;
            _db.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = recipientId,
                Type = notificationType,
                Message = notificationMessage,
                TicketId = ticket.Id,
                CreatedAt = now
            });
        }

        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        _cache.Remove($"Tickets_{CurrentDepartmentId}");

        var response = ToResponse(ticket);
        await _hub.Clients.Group(CurrentDepartmentId.ToString()).SendAsync("TicketUpdated", response);

        return Ok(response);
    }
}
