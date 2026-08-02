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

[Collection("Integration")]
public class SlaLogicIntegrationTests : IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _client = null!;
    private string _adminId = Guid.NewGuid().ToString();
    private Guid _deptId = Guid.NewGuid();

    public SlaLogicIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        _client = _factory.CreateClient();
        
        using var db = _factory.Services.GetRequiredService<SystemDbContextFactory>().CreateSystemContext();
        await db.Database.ExecuteSqlRawAsync("DELETE FROM \"Tickets\"; DELETE FROM \"AuditLogs\"; DELETE FROM \"AspNetUsers\"; DELETE FROM \"Assets\"; DELETE FROM \"Departments\";");
        
        var dept = new Department { Id = _deptId, Name = "SLA Dept" };
        var admin = new ApplicationUser { Id = _adminId, UserName = "admin@sla.com", Email = "admin@sla.com", FullName = "Admin", DepartmentId = _deptId };
        
        db.Departments.Add(dept);
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        var token = GenerateToken(_adminId, "Admin", _deptId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private string GenerateToken(string userId, string role, Guid deptId)
    {
        using var scope = _factory.Services.CreateScope();
        var user = new ApplicationUser { Id = userId, Email = "test@test.com", FullName = "Test User", DepartmentId = deptId };
        var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
        return tokenService.GenerateAccessToken(user, role);
    }

    [Fact]
    public async Task Sla_ExactBoundaryMatch_IsCompliant()
    {
        // Arrange
        using var db = _factory.Services.GetRequiredService<SystemDbContextFactory>().CreateSystemContext();
        var asset = new Asset { Id = Guid.NewGuid(), Name = "Asset1", Status = "Active", DepartmentId = _deptId };
        db.Assets.Add(asset);
        var ticket = new Ticket { Id = Guid.NewGuid(), Title = "Boundary", Status = "PendingVerification", Priority = "High", DepartmentId = _deptId, CreatedAt = DateTime.UtcNow, SlaDeadline = DateTime.UtcNow.AddMinutes(5), SlaBreached = false, AssetId = asset.Id };
        db.Tickets.Add(ticket);
        await db.SaveChangesAsync();

        // Simulate time passing to EXACTLY the deadline
        ticket.SlaDeadline = DateTime.UtcNow.AddSeconds(2); // slightly in the future
        await db.SaveChangesAsync();

        // Act
        var request = new { Accept = true, ResolutionNote = "Fixed" };
        var response = await _client.PostAsJsonAsync($"/api/tickets/{ticket.Id}/verify", request);
        response.EnsureSuccessStatusCode();

        // Assert
        var updatedTicket = await db.Tickets.FindAsync(ticket.Id);
        await db.Entry(updatedTicket!).ReloadAsync();
        Assert.False(updatedTicket!.SlaBreached); // Resolved before or exactly at deadline
    }

    [Fact]
    public async Task Sla_ReopenedTicket_PreservesFirstResolutionState_WhenCompliant()
    {
        // Arrange
        using var db = _factory.Services.GetRequiredService<SystemDbContextFactory>().CreateSystemContext();
        var asset = new Asset { Id = Guid.NewGuid(), Name = "Asset2", Status = "Active", DepartmentId = _deptId };
        db.Assets.Add(asset);
        var ticket = new Ticket { Id = Guid.NewGuid(), Title = "Reopen", Status = "Resolved", Priority = "High", DepartmentId = _deptId, CreatedAt = DateTime.UtcNow.AddDays(-2), SlaDeadline = DateTime.UtcNow.AddDays(-1), SlaBreached = false, AssetId = asset.Id };
        db.Tickets.Add(ticket);
        
        // We MUST add an AuditLog simulating the FIRST resolution to test the new logic
        var auditLog = new AuditLog { EntityName = "Ticket", EntityId = ticket.Id.ToString(), Action = "Modified", Timestamp = DateTime.UtcNow.AddDays(-1.5), NewValues = "{\"Status\":\"Resolved\"}" };
        db.AuditLogs.Add(auditLog);
        await db.SaveChangesAsync();

        // Act 1: Reopen the ticket
        var reopenRequest = new { Status = "Open" };
        var reopenResponse = await _client.PutAsJsonAsync($"/api/tickets/{ticket.Id}/status", reopenRequest);
        reopenResponse.EnsureSuccessStatusCode();

        // Setup 2: Set status to PendingVerification directly so we can hit the verify endpoint
        ticket.Status = "PendingVerification";
        await db.SaveChangesAsync();

        // Act 2: Resolve it again via the verify endpoint (now it is past the deadline)
        var verifyRequest = new { Accept = true, ResolutionNote = "Fixed again" };
        var verifyResponse = await _client.PostAsJsonAsync($"/api/tickets/{ticket.Id}/verify", verifyRequest);
        verifyResponse.EnsureSuccessStatusCode();

        // Assert
        var updatedTicket = await db.Tickets.FindAsync(ticket.Id);
        await db.Entry(updatedTicket!).ReloadAsync();
        // It should still be compliant because the first resolution was compliant!
        Assert.False(updatedTicket!.SlaBreached);
    }
}
