using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Data;

/// <summary>
/// Inherits from IdentityDbContext so EF manages the Identity tables
/// (AspNetUsers, AspNetRoles, etc.) alongside our own entities.
///
/// Key behaviours added for Milestone 4:
///  - IHttpContextAccessor injected to read the current user ID for audit entries.
///  - SaveChangesAsync override that automatically writes an AuditLog row for
///    every Ticket or Asset change — structural impossibility to forget it from
///    controller code.
/// </summary>
public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor httpContextAccessor)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Notification> Notifications => Set<Notification>();

    // ─── Audit trail ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Intercepts every save and writes an audit log entry for any Ticket or Asset
    /// that changed. The snapshot of OldValues / NewValues is captured BEFORE
    /// base.SaveChangesAsync runs, so we see the actual diff.
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Capture entries NOW — after base runs, ChangeTracker resets
        var auditEntries = ChangeTracker.Entries()
            .Where(e => e.Entity is Ticket or Asset
                     && (e.State == EntityState.Modified || e.State == EntityState.Added))
            .ToList();

        if (auditEntries.Count > 0)
        {
            var userId = _httpContextAccessor.HttpContext?
                             .User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? "system"; // background jobs have no HttpContext

            var now = DateTime.UtcNow;

            var logs = auditEntries.Select(e =>
            {
                // Get primary key value generically — works for both Ticket (Guid) and Asset (Guid)
                var entityId = e.Properties
                    .FirstOrDefault(p => p.Metadata.IsPrimaryKey())?
                    .CurrentValue?
                    .ToString() ?? "";

                return new AuditLog
                {
                    EntityName = e.Entity.GetType().Name,
                    EntityId = entityId,
                    Action = e.State.ToString(), // "Added" or "Modified"
                    ChangedByUserId = userId,
                    Timestamp = now,
                    // Scalar property snapshots only — no navigation properties, no cycles
                    OldValues = e.State == EntityState.Modified
                        ? JsonSerializer.Serialize(
                            e.OriginalValues.Properties
                             .ToDictionary(p => p.Name, p => e.OriginalValues[p]))
                        : null,
                    NewValues = JsonSerializer.Serialize(
                        e.CurrentValues.Properties
                         .ToDictionary(p => p.Name, p => e.CurrentValues[p]))
                };
            }).ToList();

            // Add them to the context — they'll be saved in the same transaction
            // as the entity change, keeping the audit log and data in sync.
            AuditLogs.AddRange(logs);
        }

        return await base.SaveChangesAsync(cancellationToken);
    }

    // ─── Model configuration ─────────────────────────────────────────────────────

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder); // Must call base — configures Identity tables

        // ApplicationUser → Department (many-to-one)
        modelBuilder.Entity<ApplicationUser>()
            .HasOne(u => u.Department)
            .WithMany(d => d.Users)
            .HasForeignKey(u => u.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // RefreshToken → ApplicationUser (many-to-one)
        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId);

        // Index on TokenHash for fast lookup on every /refresh call
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.TokenHash)
            .IsUnique();

        // Asset → Department
        modelBuilder.Entity<Asset>()
            .HasOne(a => a.Department)
            .WithMany(d => d.Assets)
            .HasForeignKey(a => a.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ticket → Department
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.Department)
            .WithMany(d => d.Tickets)
            .HasForeignKey(t => t.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ticket → Asset
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.Asset)
            .WithMany()
            .HasForeignKey(t => t.AssetId)
            .OnDelete(DeleteBehavior.Restrict);

        // Ticket → AssignedToUser
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.AssignedToUser)
            .WithMany()
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Ticket → ClaimedByUser
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.ClaimedByUser)
            .WithMany()
            .HasForeignKey(t => t.ClaimedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Ticket → VerifiedByUser
        modelBuilder.Entity<Ticket>()
            .HasOne(t => t.VerifiedByUser)
            .WithMany()
            .HasForeignKey(t => t.VerifiedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Performance Indexes for API
        modelBuilder.Entity<Ticket>().HasIndex(t => t.DepartmentId);
        modelBuilder.Entity<Ticket>().HasIndex(t => t.Status);
        modelBuilder.Entity<Ticket>().HasIndex(t => t.AssetId);

        // ── Notification ──────────────────────────────────────────────────────
        // Notifications are filtered by UserId in queries, not by RLS.
        // RLS is not applied to this table because a notification only reveals
        // that an event occurred on a ticket — no cross-department data leaks.
        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Index: fast lookup of all notifications for a user (the common read pattern)
        modelBuilder.Entity<Notification>()
            .HasIndex(n => new { n.UserId, n.CreatedAt });

        // ── AuditLog ──────────────────────────────────────────────────────────────
        // Store snapshots as Postgres jsonb — queryable with -> / ->> operators
        modelBuilder.Entity<AuditLog>()
            .Property(a => a.OldValues)
            .HasColumnType("jsonb");

        modelBuilder.Entity<AuditLog>()
            .Property(a => a.NewValues)
            .HasColumnType("jsonb");

        // Indexes to support the common query patterns:
        //  - "give me the history for this specific ticket"
        //  - "give me all changes in the last hour"
        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => new { a.EntityName, a.EntityId });

        modelBuilder.Entity<AuditLog>()
            .HasIndex(a => a.Timestamp);
    }
}
