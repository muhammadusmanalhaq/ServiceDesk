namespace ServiceDesk.Api.Models;

public class Ticket
{
    public Guid Id { get; set; }
    
    // Human-readable sequential ID (e.g. #1042)
    public int TicketNumber { get; set; }

    public string Title { get; set; } = "";
    public string Description { get; set; } = "";

    /// <summary>
    /// Lifecycle: Open → InProgress → PendingVerification → Resolved | Open (rejected)
    /// PendingVerification = Agent has claimed completion; awaiting Admin/Manager confirmation.
    /// </summary>
    public string Status { get; set; } = "Open"; // Open, InProgress, PendingVerification, Resolved, Closed

    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Critical

    // Relationships
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    // Assigned to a specific user (nullable, since ticket starts unassigned)
    public string? AssignedToUserId { get; set; }
    public ApplicationUser? AssignedToUser { get; set; }

    // ── Engineer Claim workflow ───────────────────────────────────────────────
    // Step 1: Agent marks work complete. Ticket enters PendingVerification.
    public string? ClaimedByUserId { get; set; }
    public ApplicationUser? ClaimedByUser { get; set; }
    public DateTime? ClaimedAt { get; set; }

    // Step 2: Admin/Manager accepts (→ Resolved) or rejects (→ InProgress) the claim.
    public string? VerifiedByUserId { get; set; }
    public ApplicationUser? VerifiedByUser { get; set; }
    public DateTime? VerifiedAt { get; set; }

    /// <summary>
    /// Admin note supplied during verification. Required on rejection, optional on acceptance.
    /// </summary>
    public string? ResolutionNote { get; set; }

    // SLA tracking
    public DateTime SlaDeadline { get; set; }
    public bool SlaBreached { get; set; }
    
    public DateTime CreatedAt { get; set; }

    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
}
