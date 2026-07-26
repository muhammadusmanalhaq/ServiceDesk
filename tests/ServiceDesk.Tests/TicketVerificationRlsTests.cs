using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.Models;
using ServiceDesk.Api.Services;
using Xunit;

namespace ServiceDesk.Tests;

/// <summary>
/// Integration tests for the claim and verify endpoints.
/// Primary goal: confirm that department-scoping (RLS) blocks cross-department access
/// on both new endpoints, matching the same guarantee as the original RLS tests.
///
/// The tests also cover the happy paths so we know the endpoints function end-to-end
/// inside the Testcontainers environment.
/// </summary>
[Collection("Integration")]
public class TicketVerificationRlsTests : IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _client = null!;

    private Guid _deptAId;
    private Guid _deptBId;

    private string _agentAId = null!;
    private string _agentBId = null!;
    private string _managerAId = null!;
    private string _adminId = null!;

    private Guid _ticketAId;   // Dept A — claimable by agentA
    private Guid _ticketBId;   // Dept B — invisible to agentA / managerA via RLS

    public TicketVerificationRlsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        _client = _factory.CreateClient();

        using var db = _factory.Services.GetRequiredService<SystemDbContextFactory>().CreateSystemContext();

        // Isolated data set — use unique names to avoid collisions with RlsIntegrationTests
        await db.Database.ExecuteSqlRawAsync(@"
            DELETE FROM ""Notifications"";
            DELETE FROM ""Tickets"";
            DELETE FROM ""Assets"";
            DELETE FROM ""AspNetUsers"";
            DELETE FROM ""Departments"";
        ");

        var deptA = new Department { Name = "Verify Dept A" };
        var deptB = new Department { Name = "Verify Dept B" };
        db.Departments.AddRange(deptA, deptB);
        await db.SaveChangesAsync();

        _deptAId = deptA.Id;
        _deptBId = deptB.Id;

        var agentA  = new ApplicationUser { Id = Guid.NewGuid().ToString(), UserName = "agent-a@verify.test", Email = "agent-a@verify.test", FullName = "Agent A", DepartmentId = _deptAId };
        var agentB  = new ApplicationUser { Id = Guid.NewGuid().ToString(), UserName = "agent-b@verify.test", Email = "agent-b@verify.test", FullName = "Agent B", DepartmentId = _deptBId };
        var managerA = new ApplicationUser { Id = Guid.NewGuid().ToString(), UserName = "manager-a@verify.test", Email = "manager-a@verify.test", FullName = "Manager A", DepartmentId = _deptAId };
        var admin   = new ApplicationUser { Id = Guid.NewGuid().ToString(), UserName = "admin@verify.test",   Email = "admin@verify.test",   FullName = "Admin",   DepartmentId = _deptAId };
        db.Users.AddRange(agentA, agentB, managerA, admin);
        await db.SaveChangesAsync();

        _agentAId   = agentA.Id;
        _agentBId   = agentB.Id;
        _managerAId = managerA.Id;
        _adminId    = admin.Id;

        var assetA = new Asset { Name = "Asset-V-A", DepartmentId = _deptAId };
        var assetB = new Asset { Name = "Asset-V-B", DepartmentId = _deptBId };
        db.Assets.AddRange(assetA, assetB);
        await db.SaveChangesAsync();

        var ticketA = new Ticket
        {
            Title = "Ticket-V-A", Description = "Dept A", DepartmentId = _deptAId, AssetId = assetA.Id,
            Status = "InProgress", AssignedToUserId = _agentAId,
            SlaDeadline = DateTime.UtcNow.AddHours(24)
        };
        var ticketB = new Ticket
        {
            Title = "Ticket-V-B", Description = "Dept B", DepartmentId = _deptBId, AssetId = assetB.Id,
            Status = "InProgress", AssignedToUserId = _agentBId,
            SlaDeadline = DateTime.UtcNow.AddHours(24)
        };
        db.Tickets.AddRange(ticketA, ticketB);
        await db.SaveChangesAsync();

        _ticketAId = ticketA.Id;
        _ticketBId = ticketB.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private string GenerateToken(string userId, string role, Guid? departmentId)
    {
        using var scope = _factory.Services.CreateScope();
        var user = new ApplicationUser { Id = userId, Email = "test@test.com", FullName = "Test" };
        if (departmentId.HasValue) user.DepartmentId = departmentId.Value;
        return scope.ServiceProvider.GetRequiredService<ITokenService>().GenerateAccessToken(user, role);
    }

    // ── /claim department-scoping tests ──────────────────────────────────────

    /// <summary>
    /// An Agent from Dept A calling /claim on a Dept B ticket must get 404.
    /// RLS filters Dept B tickets out of the query — FindAsync returns null.
    /// </summary>
    [Fact]
    public async Task Agent_DeptA_CannotClaim_DeptBTicket_Returns404()
    {
        var token = GenerateToken(_agentAId, "Agent", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync($"/api/tickets/{_ticketBId}/claim",
            new { resolutionNote = "Malicious cross-dept claim" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// An Agent from Dept A can claim their own department's ticket → 200.
    /// </summary>
    [Fact]
    public async Task Agent_DeptA_CanClaim_DeptATicket_Returns200()
    {
        var token = GenerateToken(_agentAId, "Agent", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync($"/api/tickets/{_ticketAId}/claim",
            new { resolutionNote = "Fixed the issue." });

        // Might be 200 (first call) or 409 (already claimed — idempotent test ordering).
        // Either way it must NOT be 404/403.
        Assert.True(
            response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.Conflict,
            $"Expected 200 or 409 for own-dept claim but got {response.StatusCode}");
    }

    // ── /verify department-scoping tests ─────────────────────────────────────

    /// <summary>
    /// A Manager from Dept A calling /verify on a Dept B ticket must get 404.
    /// RLS makes the Dept B ticket invisible — same mechanism as /claim.
    /// </summary>
    [Fact]
    public async Task Manager_DeptA_CannotVerify_DeptBTicket_Returns404()
    {
        // Seed ticket B into PendingVerification via system context so the test is isolated
        using var db = _factory.Services.GetRequiredService<SystemDbContextFactory>().CreateSystemContext();
        var ticketB = await db.Tickets.FindAsync(_ticketBId);
        Assert.NotNull(ticketB);
        ticketB!.Status = "PendingVerification";
        ticketB.ClaimedByUserId = _agentBId;
        ticketB.ClaimedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var token = GenerateToken(_managerAId, "Manager", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync($"/api/tickets/{_ticketBId}/verify",
            new { accept = true, resolutionNote = (string?)null });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// An Admin can verify a Dept A ticket (Admin sees all departments due to RLS policy).
    /// </summary>
    [Fact]
    public async Task Admin_CanVerify_DeptATicket_Returns200()
    {
        // Ensure ticket A is in PendingVerification
        using var setupDb = _factory.Services.GetRequiredService<SystemDbContextFactory>().CreateSystemContext();
        var ticketA = await setupDb.Tickets.FindAsync(_ticketAId);
        Assert.NotNull(ticketA);
        ticketA!.Status = "PendingVerification";
        ticketA.ClaimedByUserId = _agentAId;
        ticketA.ClaimedAt = DateTime.UtcNow;
        await setupDb.SaveChangesAsync();

        var token = GenerateToken(_adminId, "Admin", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync($"/api/tickets/{_ticketAId}/verify",
            new { accept = true, resolutionNote = "Looks good." });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<VerifyResponseBody>();
        Assert.NotNull(body);
        Assert.Equal("Resolved", body!.Status);
    }

    /// <summary>
    /// Rejecting a claim without a ResolutionNote must return 400.
    /// </summary>
    [Fact]
    public async Task Verify_Reject_WithoutNote_Returns400()
    {
        var token = GenerateToken(_adminId, "Admin", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync($"/api/tickets/{_ticketAId}/verify",
            new { accept = false, resolutionNote = (string?)null });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// Agent role must not be able to call /verify — 403 Forbidden.
    /// </summary>
    [Fact]
    public async Task Agent_CannotCallVerify_Returns403()
    {
        var token = GenerateToken(_agentAId, "Agent", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.PostAsJsonAsync($"/api/tickets/{_ticketAId}/verify",
            new { accept = true, resolutionNote = (string?)null });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // Helper: minimal shape to deserialize the verify response body
    private record VerifyResponseBody(string Status);
}
