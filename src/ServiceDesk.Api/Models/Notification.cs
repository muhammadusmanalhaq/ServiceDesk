namespace ServiceDesk.Api.Models;

/// <summary>
/// Represents a single in-app notification for a user.
/// Written by the claim and verification endpoints, read back by GET /api/notifications.
///
/// Deliberately not RLS-scoped: notifications are filtered by UserId in the query
/// (a user reads only their own), not by department. The notification record only
/// stores the ticket ID as a reference — no sensitive ticket payload is duplicated.
/// </summary>
public class Notification
{
    public Guid Id { get; set; }

    /// <summary>The user this notification is addressed to.</summary>
    public string UserId { get; set; } = "";
    public ApplicationUser User { get; set; } = null!;

    /// <summary>
    /// Category: "TicketClaimed", "ClaimAccepted", "ClaimRejected", "SlaBreached"
    /// </summary>
    public string Type { get; set; } = "";

    public string Message { get; set; } = "";

    /// <summary>Optional reference to the ticket that triggered this notification.</summary>
    public Guid? TicketId { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
