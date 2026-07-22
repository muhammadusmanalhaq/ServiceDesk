namespace ServiceDesk.Api.Models;

/// <summary>
/// A department that owns tickets and assets. Data isolation is enforced at the
/// database layer via Postgres RLS — every query is scoped to the department
/// extracted from the JWT (Milestone 3).
/// </summary>
public class Department
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";

    // Navigation properties — expanded with Assets and Tickets in Milestone 3
    public ICollection<ApplicationUser> Users { get; set; } = [];
}
