namespace ServiceDesk.Api.DTOs.CoreDomain;

/// <summary>Response DTO for a single audit log entry.</summary>
public record AuditLogResponse(
    long Id,
    string EntityName,
    string EntityId,
    string Action,
    string? ChangedByUserId,
    string? ChangedByName,
    DateTime Timestamp,
    string? OldValues,
    string? NewValues
);
