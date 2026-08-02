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
public class RlsIntegrationTests : IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _client = null!;

    // Seeded data IDs
    private Guid _deptAId;
    private Guid _deptBId;
    
    private string _agentAId = null!;
    private string _managerAId = null!;
    private string _adminId = null!;

    private Guid _ticketBId;
    private Guid _ticketCForWriteTestId;

    public RlsIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        _client = _factory.CreateClient();

        using var db = _factory.Services.GetRequiredService<SystemDbContextFactory>().CreateSystemContext();
        
        // Clean up previous test data to prevent cross-test corruption
        await db.Database.ExecuteSqlRawAsync("DELETE FROM \"Notifications\"; DELETE FROM \"Tickets\"; DELETE FROM \"Assets\"; DELETE FROM \"AspNetUsers\"; DELETE FROM \"Departments\";");

        // Seed Departments
        var deptA = new Department { Name = "Test Dept A" };
        var deptB = new Department { Name = "Test Dept B" };
        db.Departments.AddRange(deptA, deptB);
        await db.SaveChangesAsync();

        _deptAId = deptA.Id;
        _deptBId = deptB.Id;

        // Seed Users
        var agentA = new ApplicationUser { Id = Guid.NewGuid().ToString(), UserName = "agent@test.com", Email = "agent@test.com", FullName = "Agent A", DepartmentId = _deptAId };
        var managerA = new ApplicationUser { Id = Guid.NewGuid().ToString(), UserName = "manager@test.com", Email = "manager@test.com", FullName = "Manager A", DepartmentId = _deptAId };
        var admin = new ApplicationUser { Id = Guid.NewGuid().ToString(), UserName = "admin@test.com", Email = "admin@test.com", FullName = "Admin", DepartmentId = _deptAId };
        db.Users.AddRange(agentA, managerA, admin);
        await db.SaveChangesAsync();

        _agentAId = agentA.Id;
        _managerAId = managerA.Id;
        _adminId = admin.Id;

        // Seed Assets
        var assetA = new Asset { Name = "Asset A", DepartmentId = _deptAId };
        var assetB = new Asset { Name = "Asset B", DepartmentId = _deptBId };
        db.Assets.AddRange(assetA, assetB);
        await db.SaveChangesAsync();

        // Seed Tickets
        var ticketA = new Ticket { Title = "Ticket A", Description = "Dept A", DepartmentId = _deptAId, AssetId = assetA.Id, AssignedToUserId = _agentAId };
        var ticketB = new Ticket { Title = "Ticket B", Description = "Dept B", DepartmentId = _deptBId, AssetId = assetB.Id, AssignedToUserId = _agentAId };
        var ticketC = new Ticket { Title = "Ticket C for Write", Description = "Dept B", DepartmentId = _deptBId, AssetId = assetB.Id, AssignedToUserId = _agentAId };
        db.Tickets.AddRange(ticketA, ticketB, ticketC);
        await db.SaveChangesAsync();

        // [DEBUG] Check policies
        await db.Database.CloseConnectionAsync();

        _ticketBId = ticketB.Id;
        _ticketCForWriteTestId = ticketC.Id;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private string GenerateToken(string userId, string role, Guid? departmentId)
    {
        using var scope = _factory.Services.CreateScope();
        var user = new ApplicationUser { Id = userId, Email = "test@test.com", FullName = "Test User" };
        if (departmentId.HasValue) user.DepartmentId = departmentId.Value;
        
        var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
        return tokenService.GenerateAccessToken(user, role);
    }

    [Fact]
    public async Task Agent_DeptA_CannotGet_DeptBTicket_Returns404()
    {
        // Arrange
        var token = GenerateToken(_agentAId, "Agent", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync($"/api/tickets/{_ticketBId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Agent_DeptA_GetTickets_OnlyReturns_DeptATickets()
    {
        // Arrange
        var token = GenerateToken(_agentAId, "Agent", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/tickets");
        response.EnsureSuccessStatusCode();
        var tickets = await response.Content.ReadFromJsonAsync<List<Ticket>>();

        // Assert
        Assert.NotNull(tickets);
        Assert.NotEmpty(tickets);
        Assert.All(tickets, t => Assert.Equal(_deptAId, t.DepartmentId));
    }

    [Fact]
    public async Task Agent_DeptA_CannotUpdate_DeptBTicket_Returns404()
    {
        // Arrange
        var token = GenerateToken(_agentAId, "Agent", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        
        var updateContent = JsonContent.Create(new { Status = "InProgress" });

        // Act
        var response = await _client.PutAsync($"/api/tickets/{_ticketCForWriteTestId}/status", updateContent);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Manager_DeptA_CannotGet_DeptBTicket_Returns404()
    {
        // Arrange
        var token = GenerateToken(_managerAId, "Manager", _deptAId);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync($"/api/tickets/{_ticketBId}");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Admin_CanGet_DeptBTicket_Returns200()
    {
        // Arrange
        var token = GenerateToken(_adminId, "Admin", _deptAId); // Admins might not have a department
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync($"/api/tickets/{_ticketBId}");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
