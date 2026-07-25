namespace ServiceDesk.Api.Models;

public class Ticket
{
    public Guid Id { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Status { get; set; } = "Open"; // Open, InProgress, Resolved, Closed
    public string Priority { get; set; } = "Medium"; // Low, Medium, High, Critical

    // Relationships
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    // Assigned to a specific user (nullable, since ticket starts unassigned)
    public string? AssignedToUserId { get; set; }
    public ApplicationUser? AssignedToUser { get; set; }

    // SLA tracking
    public DateTime SlaDeadline { get; set; }
    public bool SlaBreached { get; set; }
    
    public DateTime CreatedAt { get; set; }
}
