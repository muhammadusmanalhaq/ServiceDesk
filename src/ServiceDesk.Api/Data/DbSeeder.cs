using Microsoft.AspNetCore.Identity;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Data;

public static class DbSeeder
{
    public static readonly Guid ItDeptId           = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid OpsDeptId          = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid FieldSupportDeptId = Guid.Parse("33333333-3333-3333-3333-333333333333");

    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var dbFactory   = services.GetRequiredService<SystemDbContextFactory>();
        await using var db = dbFactory.CreateSystemContext();

        // ── Roles ──────────────────────────────────────────────────────────────
        string[] roles = ["Admin", "Manager", "Agent"];
        foreach (var role in roles)
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));

        // ── Departments ────────────────────────────────────────────────────────
        if (!db.Departments.Any())
        {
            db.Departments.AddRange(
                new Department { Id = ItDeptId,           Name = "IT" },
                new Department { Id = OpsDeptId,          Name = "Operations" },
                new Department { Id = FieldSupportDeptId, Name = "Field Support" }
            );
            await db.SaveChangesAsync();
        }

        // ── Users ──────────────────────────────────────────────────────────────
        // System / cross-dept admin
        await EnsureUser(userManager, "admin@servicedesk.local", "Admin",   ItDeptId,  "System Admin");

        // IT Department (dept 1)
        await EnsureUser(userManager, "alice@test.com", "Admin",   ItDeptId, "Alice Admin");       // existing admin
        await EnsureUser(userManager, "sarah@test.com", "Manager", ItDeptId, "Sarah IT Manager");  // NEW – IT Manager
        await EnsureUser(userManager, "bob@test.com",   "Agent",   ItDeptId, "Bob Agent");         // existing IT agent
        await EnsureUser(userManager, "dan@test.com",   "Agent",   ItDeptId, "Dan IT Agent");      // NEW – second IT agent

        // Operations Department (dept 2)
        await EnsureUser(userManager, "charlie@test.com", "Manager", OpsDeptId, "Charlie Ops Manager"); // existing ops manager
        await EnsureUser(userManager, "priya@test.com",   "Agent",   OpsDeptId, "Priya Ops Agent");     // NEW
        await EnsureUser(userManager, "jay@test.com",     "Agent",   OpsDeptId, "Jay Ops Agent");       // NEW

        // ── Assets ─────────────────────────────────────────────────────────────
        if (!db.Assets.Any())
        {
            db.Assets.AddRange(
                // IT assets
                new Asset { Id = Guid.NewGuid(), Name = "ThinkPad T14",          Status = "Active",      DepartmentId = ItDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Dell XPS 15",            Status = "Active",      DepartmentId = ItDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "MacBook Pro M3",         Status = "Active",      DepartmentId = ItDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "HP EliteDesk 800",       Status = "Maintenance", DepartmentId = ItDeptId },
                // Operations assets
                new Asset { Id = Guid.NewGuid(), Name = "Cisco Switch 2960",     Status = "Active",      DepartmentId = OpsDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Server Rack B",          Status = "Active",      DepartmentId = OpsDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Forklift Controller #3", Status = "Maintenance", DepartmentId = OpsDeptId },
                // Field Support assets
                new Asset { Id = Guid.NewGuid(), Name = "Field Tablet A",         Status = "Active",      DepartmentId = FieldSupportDeptId },
                new Asset { Id = Guid.NewGuid(), Name = "Field Scanner X",        Status = "Maintenance", DepartmentId = FieldSupportDeptId }
            );
            await db.SaveChangesAsync();
        }

        // ── Tickets ────────────────────────────────────────────────────────────
        if (!db.Tickets.Any())
        {
            var itAssets  = db.Assets.Where(a => a.DepartmentId == ItDeptId).ToList();
            var opsAssets = db.Assets.Where(a => a.DepartmentId == OpsDeptId).ToList();

            var bobUser     = await userManager.FindByEmailAsync("bob@test.com");
            var danUser     = await userManager.FindByEmailAsync("dan@test.com");
            var priyaUser   = await userManager.FindByEmailAsync("priya@test.com");
            var jayUser     = await userManager.FindByEmailAsync("jay@test.com");
            var sarahUser   = await userManager.FindByEmailAsync("sarah@test.com");
            var charlieUser = await userManager.FindByEmailAsync("charlie@test.com");
            var aliceUser   = await userManager.FindByEmailAsync("alice@test.com");

            var now = DateTime.UtcNow;

            var tickets = new List<Ticket>
            {
                // ── IT Department ─────────────────────────────────────────────

                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "Laptop won't boot after Windows update",
                    Description = "User reports ThinkPad T14 stuck on spinning dots after latest Windows update. Attempted hard reset – no change. Needs OS recovery.",
                    Status = "Open", Priority = "High",
                    AssetId = itAssets.First(a => a.Name == "ThinkPad T14").Id, DepartmentId = ItDeptId,
                    CreatedAt = now.AddDays(-3),
                    SlaDeadline = now.AddDays(-3).AddHours(24), SlaBreached = true
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "VPN connection dropping every 30 minutes",
                    Description = "Remote staff experiencing VPN disconnects roughly every 30 mins. Affects Dell XPS 15 machines. Likely split-tunnelling misconfiguration.",
                    Status = "InProgress", Priority = "High",
                    AssetId = itAssets.First(a => a.Name == "Dell XPS 15").Id, DepartmentId = ItDeptId,
                    AssignedToUserId = bobUser?.Id,
                    CreatedAt = now.AddDays(-2),
                    SlaDeadline = now.AddDays(-2).AddHours(24), SlaBreached = true
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "New MacBook Pro setup for Finance Director",
                    Description = "MacBook Pro M3 needs to be imaged, domain-joined and configured with the standard finance software suite before Monday.",
                    Status = "PendingVerification", Priority = "Medium",
                    AssetId = itAssets.First(a => a.Name == "MacBook Pro M3").Id, DepartmentId = ItDeptId,
                    AssignedToUserId = danUser?.Id,
                    ClaimedByUserId  = danUser?.Id, ClaimedAt = now.AddHours(-5),
                    CreatedAt = now.AddDays(-1),
                    SlaDeadline = now.AddDays(-1).AddHours(24), SlaBreached = false
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "HP EliteDesk fan noise complaint",
                    Description = "Loud grinding noise from HP EliteDesk 800 desktop in open-plan area. Suspected dust build-up or failing fan bearing.",
                    Status = "Resolved", Priority = "Low",
                    AssetId = itAssets.First(a => a.Name == "HP EliteDesk 800").Id, DepartmentId = ItDeptId,
                    AssignedToUserId = bobUser?.Id,
                    ClaimedByUserId  = bobUser?.Id, ClaimedAt = now.AddDays(-1),
                    VerifiedByUserId = sarahUser?.Id, VerifiedAt = now.AddHours(-12),
                    ResolutionNote = "Fan replaced and chassis cleaned. Noise eliminated. User confirmed satisfied.",
                    CreatedAt = now.AddDays(-5),
                    SlaDeadline = now.AddDays(-5).AddHours(48), SlaBreached = false
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "CRITICAL: Domain Controller unreachable",
                    Description = "DC01 not responding to ping or RDP. All domain logins across the building are failing. Production down.",
                    Status = "Resolved", Priority = "Critical",
                    AssetId = itAssets.First(a => a.Name == "ThinkPad T14").Id, DepartmentId = ItDeptId,
                    AssignedToUserId = danUser?.Id,
                    ClaimedByUserId  = danUser?.Id, ClaimedAt = now.AddDays(-6).AddHours(3),
                    VerifiedByUserId = aliceUser?.Id, VerifiedAt = now.AddDays(-6).AddHours(5),
                    ResolutionNote = "DC01 crashed due to a full disk. Cleared old event logs, freed 40GB, restarted services. Added disk monitoring to prevent recurrence.",
                    CreatedAt = now.AddDays(-6),
                    SlaDeadline = now.AddDays(-6).AddHours(4), SlaBreached = false
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "Printer offline – 3rd floor",
                    Description = "HP LaserJet on the 3rd floor shows offline in Windows. Restarting print spooler did not help. May need driver reinstall.",
                    Status = "Closed", Priority = "Low",
                    AssetId = itAssets.First(a => a.Name == "Dell XPS 15").Id, DepartmentId = ItDeptId,
                    AssignedToUserId = bobUser?.Id,
                    ClaimedByUserId  = bobUser?.Id, ClaimedAt = now.AddDays(-8).AddHours(4),
                    VerifiedByUserId = sarahUser?.Id, VerifiedAt = now.AddDays(-8).AddHours(6),
                    ResolutionNote = "Driver reinstalled and printer brought back online. Closed after 24h with no further complaints.",
                    CreatedAt = now.AddDays(-9),
                    SlaDeadline = now.AddDays(-9).AddHours(48), SlaBreached = false
                },

                // ── Operations Department ──────────────────────────────────────

                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "Cisco Switch port flapping on VLAN 20",
                    Description = "Network monitoring alerts show port Gi0/12 on Cisco Switch 2960 is flapping every ~2 minutes. Causing intermittent outages on VLAN 20. High business impact.",
                    Status = "Open", Priority = "Critical",
                    AssetId = opsAssets.First(a => a.Name == "Cisco Switch 2960").Id, DepartmentId = OpsDeptId,
                    CreatedAt = now.AddHours(-4),
                    SlaDeadline = now.AddHours(-4).AddHours(4), SlaBreached = true
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "Server Rack B: Overheating alarm triggered",
                    Description = "Rack temperature sensor exceeded 35°C threshold. Cooling fan speed at max. Needs physical inspection and possible CRAC unit check.",
                    Status = "InProgress", Priority = "High",
                    AssetId = opsAssets.First(a => a.Name == "Server Rack B").Id, DepartmentId = OpsDeptId,
                    AssignedToUserId = priyaUser?.Id,
                    CreatedAt = now.AddHours(-6),
                    SlaDeadline = now.AddHours(-6).AddHours(24), SlaBreached = false
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "Forklift Controller #3 firmware update",
                    Description = "Vendor issued mandatory safety firmware v3.1.2. Must be applied within 72hrs per HSE compliance. Device must be taken offline during update.",
                    Status = "PendingVerification", Priority = "Medium",
                    AssetId = opsAssets.First(a => a.Name == "Forklift Controller #3").Id, DepartmentId = OpsDeptId,
                    AssignedToUserId = jayUser?.Id,
                    ClaimedByUserId  = jayUser?.Id, ClaimedAt = now.AddHours(-2),
                    CreatedAt = now.AddDays(-2),
                    SlaDeadline = now.AddDays(-2).AddHours(72), SlaBreached = false
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "Monthly backup verification report",
                    Description = "Routine check to verify all Server Rack B backup jobs completed successfully this month. Review logs and produce sign-off report.",
                    Status = "Resolved", Priority = "Low",
                    AssetId = opsAssets.First(a => a.Name == "Server Rack B").Id, DepartmentId = OpsDeptId,
                    AssignedToUserId = priyaUser?.Id,
                    ClaimedByUserId  = priyaUser?.Id, ClaimedAt = now.AddDays(-3),
                    VerifiedByUserId = charlieUser?.Id, VerifiedAt = now.AddDays(-3).AddHours(2),
                    ResolutionNote = "All 28 backup jobs for the month completed successfully. Report filed in SharePoint. No anomalies detected.",
                    CreatedAt = now.AddDays(-7),
                    SlaDeadline = now.AddDays(-7).AddHours(72), SlaBreached = false
                },
                new Ticket
                {
                    Id = Guid.NewGuid(),
                    Title = "Network cable replacement – bay 4",
                    Description = "Damaged Cat6 cable behind bay 4 server causing intermittent packet loss (avg 12%). Needs physical cable replacement.",
                    Status = "Closed", Priority = "Medium",
                    AssetId = opsAssets.First(a => a.Name == "Cisco Switch 2960").Id, DepartmentId = OpsDeptId,
                    AssignedToUserId = jayUser?.Id,
                    ClaimedByUserId  = jayUser?.Id, ClaimedAt = now.AddDays(-10),
                    VerifiedByUserId = charlieUser?.Id, VerifiedAt = now.AddDays(-10).AddHours(3),
                    ResolutionNote = "10m Cat6 cable replaced. Packet loss dropped to 0%. Closed after 48h clean monitoring.",
                    CreatedAt = now.AddDays(-12),
                    SlaDeadline = now.AddDays(-12).AddHours(24), SlaBreached = false
                }
            };

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
                Email    = email,
                DepartmentId = deptId,
                FullName = fullName
            };
            await userManager.CreateAsync(user, "Password123!");
            await userManager.AddToRoleAsync(user, role);
        }
    }
}
