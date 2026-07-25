namespace ServiceDesk.Api.Models;

/// <summary>
/// Append-only log of every state change to Tickets and Assets.
/// Written automatically by AppDbContext.SaveChangesAsync — nothing in
/// the controller layer needs to remember to call this.
/// </summary>
public class AuditLog
{
    /// <summary>Auto-generated bigint — cheaper than UUID for an append-only table.</summary>
    public long Id { get; set; }

    /// <summary>"Ticket" or "Asset"</summary>
    public string EntityName { get; set; } = "";

    /// <summary>The entity's primary key as a string (Guid.ToString()).</summary>
    public string EntityId { get; set; } = "";

    /// <summary>"Added" or "Modified" — mirrors EntityState names.</summary>
    public string Action { get; set; } = "";

    /// <summary>
    /// Identity user ID of the person who triggered the change, or "system"
    /// when the change is made by a background job (e.g. SLA breach detection).
    /// </summary>
    public string? ChangedByUserId { get; set; }

    public DateTime Timestamp { get; set; }

    /// <summary>
    /// JSON snapshot of the entity's values BEFORE the change.
    /// Null for Added entries — there's nothing to diff against.
    /// Stored as Postgres jsonb for efficient querying.
    /// </summary>
    public string? OldValues { get; set; }

    /// <summary>JSON snapshot of the entity's values AFTER the change.</summary>
    public string? NewValues { get; set; }
}
