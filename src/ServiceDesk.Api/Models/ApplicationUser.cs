using Microsoft.AspNetCore.Identity;

namespace ServiceDesk.Api.Models;

/// <summary>
/// Extends IdentityUser with the two fields that matter downstream:
/// FullName (display) and DepartmentId (the claim that feeds Postgres RLS).
/// </summary>
public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = "";
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Drives the 'department_id' JWT claim and the Postgres RLS session variable.
    /// The RLS policy in Milestone 3 reads this exact claim — auth and data isolation
    /// are one mechanism, not two separate checks.
    /// </summary>
    public Guid DepartmentId { get; set; }

    // Navigation properties
    public Department Department { get; set; } = null!;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}
