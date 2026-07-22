using Microsoft.AspNetCore.Identity;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Data;

/// <summary>
/// Runs once at startup to ensure roles and seed departments exist.
/// Idempotent — safe to call every startup, skips anything already present.
/// </summary>
public static class DbSeeder
{
    // Fixed GUIDs for the seed departments so they're predictable in tests
    // and Postman collections. Real departments are created via the API.
    public static readonly Guid ItDeptId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid OpsDeptId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var db = services.GetRequiredService<AppDbContext>();

        // Seed the three roles — order doesn't matter, each is checked individually
        string[] roles = ["Admin", "Manager", "Agent"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Seed two starter departments — we need at least one to register the first user
        if (!db.Departments.Any())
        {
            db.Departments.AddRange(
                new Department { Id = ItDeptId, Name = "IT" },
                new Department { Id = OpsDeptId, Name = "Operations" }
            );
            await db.SaveChangesAsync();
        }
    }
}
