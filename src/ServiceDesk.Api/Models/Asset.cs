namespace ServiceDesk.Api.Models;

public class Asset
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Status { get; set; } = "Active"; // Active, UnderMaintenance, Retired

    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
}
