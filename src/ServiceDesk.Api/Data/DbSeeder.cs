using Microsoft.AspNetCore.Identity;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Data;

public static class DbSeeder
{
    public static readonly Guid ItDeptId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid OpsDeptId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid FieldSupportDeptId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var dbFactory = services.GetRequiredService<SystemDbContextFactory>();
        await using var db = dbFactory.CreateSystemContext();

        string[] roles = ["Admin", "Manager", "Agent"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        if (!db.Departments.Any())
        {
            db.Departments.AddRange(
                new Department { Id = ItDeptId, Name = "IT" },
                new Department { Id = OpsDeptId, Name = "Operations" },
                new Department { Id = FieldSupportDeptId, Name = "Field Support" }
            );
            await db.SaveChangesAsync();
        }

        // Create Seed Users if they don't exist
        await EnsureUser(userManager, "alice@test.com", "Admin", ItDeptId, "Alice Admin");
        await EnsureUser(userManager, "bob@test.com", "Agent", ItDeptId, "Bob Agent");
        await EnsureUser(userManager, "charlie@test.com", "Manager", OpsDeptId, "Charlie Manager");

        if (!db.Assets.Any())
        {
            var assets = new List<Asset>
            {
                new Asset { Id = Guid.NewGuid(), Name = "ThinkPad T14", Status = "Active", DepartmentId = ItDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Dell XPS 15", Status = "Active", DepartmentId = ItDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "MacBook Pro M3", Status = "Active", DepartmentId = ItDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Cisco Switch 2960", Status = "Active", DepartmentId = OpsDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Server Rack B", Status = "Active", DepartmentId = OpsDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Field Tablet A", Status = "Active", DepartmentId = FieldSupportDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Field Scanner X", Status = "Maintenance", DepartmentId = FieldSupportDeptId }
            };
            db.Assets.AddRange(assets);
            await db.SaveChangesAsync();
        }

        if (!db.Tickets.Any())
        {
            var itAssets = db.Assets.Where(a => a.DepartmentId == ItDeptId).ToList();
            var opsAssets = db.Assets.Where(a => a.DepartmentId == OpsDeptId).ToList();
            
            var tickets = new List<Ticket>();
            var rnd = new Random();
            var now = DateTime.UtcNow;

            for (int i = 1; i <= 15; i++)
            {
                var isIt = i % 2 == 0;
                var deptId = isIt ? ItDeptId : OpsDeptId;
                var assetId = isIt ? itAssets[rnd.Next(itAssets.Count)].Id : opsAssets[rnd.Next(opsAssets.Count)].Id;

                var status = i % 4 == 0 ? "Resolved" : i % 5 == 0 ? "Closed" : i % 3 == 0 ? "InProgress" : "Open";
                var priority = i % 4 == 0 ? "Critical" : i % 3 == 0 ? "High" : "Medium";
                
                var createdAt = now.AddDays(-rnd.Next(1, 10));
                // Make some breached, some compliant
                var slaDeadline = createdAt.AddHours(priority == "Critical" ? 4 : 24);
                var slaBreached = (status == "Open" || status == "InProgress") ? (now > slaDeadline) : (now > slaDeadline && rnd.Next(2) == 0);

                tickets.Add(new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = $"Seed Ticket #{i} - {priority} Issue",
                    Description = "This is a realistically seeded ticket for demonstration purposes. Need to check the logs and troubleshoot.",
                    Status = status,
                    Priority = priority,
                    AssetId = assetId,
                    DepartmentId = deptId,
                    CreatedAt = createdAt,
                    SlaDeadline = slaDeadline,
                    SlaBreached = slaBreached
                });
            }
            db.Tickets.AddRange(tickets);
            await db.SaveChangesAsync();
        }
    }

    private static async Task EnsureUser(UserManager<ApplicationUser> userManager, string email, string role, Guid deptId, string fullName)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                DepartmentId = deptId,
                FullName = fullName
            };
            await userManager.CreateAsync(user, "Password123!");
            await userManager.AddToRoleAsync(user, role);
        }
    }
}
