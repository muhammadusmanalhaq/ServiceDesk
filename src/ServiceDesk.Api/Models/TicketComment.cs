using System;

namespace ServiceDesk.Api.Models;

public class TicketComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid TicketId { get; set; }
    
    /// <summary>
    /// ID of the user who authored the comment.
    /// </summary>
    public string UserId { get; set; } = "";
    
    public string Content { get; set; } = "";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Ticket Ticket { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
}
