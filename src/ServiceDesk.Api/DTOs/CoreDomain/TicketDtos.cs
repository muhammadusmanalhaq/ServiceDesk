using System.ComponentModel.DataAnnotations;

namespace ServiceDesk.Api.DTOs.CoreDomain;

public record TicketResponse(
    Guid Id,
    int TicketNumber,
    string Title,
    string Description,
    string Status,
    string Priority,
    Guid AssetId,
    Guid DepartmentId,
    string? AssignedToUserId,
    // Claim/verify fields
    string? ClaimedByUserId,
    DateTime? ClaimedAt,
    string? VerifiedByUserId,
    DateTime? VerifiedAt,
    string? ResolutionNote,
    // SLA
    DateTime SlaDeadline,
    bool SlaBreached,
    DateTime CreatedAt,
    List<AttachmentResponse>? Attachments = null);

public record AttachmentResponse(
    Guid Id,
    string BlobPath,
    string FileName,
    string UploadedByUserId,
    DateTime UploadedAt);

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
    public string Status { get; init; } = ""; // Open, InProgress, PendingVerification, Resolved, Closed
}

public record AssignTicketRequest
{
    [Required]
    public string UserId { get; init; } = "";
}

/// <summary>
/// Request body for POST /api/tickets/{id}/claim.
/// The claiming agent may optionally supply a note describing the resolution steps.
/// </summary>
public record ClaimTicketRequest
{
    [StringLength(2000)]
    public string? ResolutionNote { get; init; }
}

/// <summary>
/// Request body for POST /api/tickets/{id}/verify (Admin or Manager only).
/// </summary>
public record VerifyTicketRequest
{
    /// <summary>true = accept the claim (Resolved); false = reject (InProgress).</summary>
    [Required]
    public bool Accept { get; init; }

    /// <summary>
    /// Mandatory when Accept = false (explains why the claim was rejected).
    /// Optional but encouraged when Accept = true.
    /// </summary>
    [StringLength(2000)]
    public string? ResolutionNote { get; init; }
}

/// <summary>Response DTO for GET /api/notifications.</summary>
public record NotificationResponse(
    Guid Id,
    string Type,
    string Message,
    Guid? TicketId,
    bool IsRead,
    DateTime CreatedAt);

public record TicketCommentResponse(
    Guid Id,
    Guid TicketId,
    string UserId,
    string AuthorName,
    string? AuthorAvatarUrl,
    string Content,
    DateTime CreatedAt
);

public record CreateTicketCommentRequest(
    [Required] string Content
);
