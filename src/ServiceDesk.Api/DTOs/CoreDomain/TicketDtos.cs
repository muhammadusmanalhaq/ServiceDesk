using System.ComponentModel.DataAnnotations;

namespace ServiceDesk.Api.DTOs.CoreDomain;

public record TicketResponse(
    Guid Id, 
    string Title, 
    string Description, 
    string Status, 
    string Priority, 
    Guid AssetId, 
    Guid DepartmentId, 
    string? AssignedToUserId, 
    DateTime SlaDeadline, 
    bool SlaBreached, 
    DateTime CreatedAt);

public record CreateTicketRequest
{
    [Required, StringLength(200)]
    public string Title { get; init; } = "";
    
    [Required]
    public string Description { get; init; } = "";
    
    [Required]
    public Guid AssetId { get; init; }
    
    [Required]
    public string Priority { get; init; } = "Medium";
}

public record UpdateTicketStatusRequest
{
    [Required]
    public string Status { get; init; } = ""; // Open, InProgress, Resolved, Closed
}

public record AssignTicketRequest
{
    [Required]
    public string UserId { get; init; } = "";
}
