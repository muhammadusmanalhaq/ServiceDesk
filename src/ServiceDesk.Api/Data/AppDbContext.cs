using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Data;

/// <summary>
/// Inherits from IdentityDbContext so EF manages the Identity tables
/// (AspNetUsers, AspNetRoles, etc.) alongside our own entities.
///
/// Future milestones add:
///  - Asset and Ticket DbSets (Milestone 3)
///  - AuditLog DbSet (Milestone 4)
///  - The RLS interceptor override on SaveChangesAsync (Milestone 4)
/// </summary>
public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder); // Must call base — configures Identity tables

        // ApplicationUser → Department (many-to-one)
        modelBuilder.Entity<ApplicationUser>()
            .HasOne(u => u.Department)
            .WithMany(d => d.Users)
            .HasForeignKey(u => u.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict); // Don't cascade-delete users if dept removed

        // RefreshToken → ApplicationUser (many-to-one)
        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId);

        // Index on TokenHash for fast lookup on every /refresh call
        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.TokenHash)
            .IsUnique();
    }
}
