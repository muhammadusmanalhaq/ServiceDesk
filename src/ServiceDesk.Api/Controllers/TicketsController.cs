using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.DTOs.CoreDomain;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/tickets")]
[Authorize]
[Produces("application/json")]
public class TicketsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TicketsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid CurrentDepartmentId => 
        Guid.Parse(User.FindFirstValue("department_id") ?? Guid.Empty.ToString());

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TicketResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        
        var tickets = await _db.Tickets
            .Select(t => new TicketResponse(
                t.Id, t.Title, t.Description, t.Status, t.Priority, 
                t.AssetId, t.DepartmentId, t.AssignedToUserId, 
                t.SlaDeadline, t.SlaBreached, t.CreatedAt))
            .ToListAsync();
            
        await transaction.CommitAsync();
        return Ok(tickets);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        
        var ticket = await _db.Tickets.FindAsync(id);
        
        await transaction.CommitAsync();

        if (ticket == null) return NotFound();

        return Ok(new TicketResponse(
            ticket.Id, ticket.Title, ticket.Description, ticket.Status, ticket.Priority, 
            ticket.AssetId, ticket.DepartmentId, ticket.AssignedToUserId, 
            ticket.SlaDeadline, ticket.SlaBreached, ticket.CreatedAt));
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

        return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, 
            new TicketResponse(
                ticket.Id, ticket.Title, ticket.Description, ticket.Status, ticket.Priority, 
                ticket.AssetId, ticket.DepartmentId, ticket.AssignedToUserId, 
                ticket.SlaDeadline, ticket.SlaBreached, ticket.CreatedAt));
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "Admin,Manager,Agent")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateTicketStatusRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        
        var ticket = await _db.Tickets.FindAsync(id);
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

        return Ok(new TicketResponse(
            ticket.Id, ticket.Title, ticket.Description, ticket.Status, ticket.Priority, 
            ticket.AssetId, ticket.DepartmentId, ticket.AssignedToUserId, 
            ticket.SlaDeadline, ticket.SlaBreached, ticket.CreatedAt));
    }

    [HttpPost("{id:guid}/assign")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(TicketResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Assign(Guid id, AssignTicketRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        
        var ticket = await _db.Tickets.FindAsync(id);
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

        return Ok(new TicketResponse(
            ticket.Id, ticket.Title, ticket.Description, ticket.Status, ticket.Priority, 
            ticket.AssetId, ticket.DepartmentId, ticket.AssignedToUserId, 
            ticket.SlaDeadline, ticket.SlaBreached, ticket.CreatedAt));
    }
}
