using System.Net;
using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using ServiceDesk.Api.Models;
using ServiceDesk.Api.Services;
using Xunit;

namespace ServiceDesk.Tests;

[Collection("Integration")]
public class RoleTierIntegrationTests : IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private HttpClient _client = null!;
    private string _agentId = Guid.NewGuid().ToString();
    private string _managerId = Guid.NewGuid().ToString();
    private string _adminId = Guid.NewGuid().ToString();

    public RoleTierIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync()
    {
        _client = _factory.CreateClient();
        return Task.CompletedTask;
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private string GenerateToken(string role)
    {
        using var scope = _factory.Services.CreateScope();
        var userId = role switch
        {
            "Agent" => _agentId,
            "Manager" => _managerId,
            "Admin" => _adminId,
            _ => throw new ArgumentException("Invalid role")
        };
        var user = new ApplicationUser { Id = userId, Email = "test@test.com", FullName = "Test User", DepartmentId = Guid.NewGuid() };
        var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
        return tokenService.GenerateAccessToken(user, role);
    }

    [Theory]
    // Audit Logs (recent)
    [InlineData("Admin", "GET", "/api/audit-logs/recent", HttpStatusCode.OK)]
    [InlineData("Manager", "GET", "/api/audit-logs/recent", HttpStatusCode.OK)]
    [InlineData("Agent", "GET", "/api/audit-logs/recent", HttpStatusCode.Forbidden)]
    // Metrics Dashboard
    [InlineData("Admin", "GET", "/api/metrics/dashboard", HttpStatusCode.OK)]
    [InlineData("Manager", "GET", "/api/metrics/dashboard", HttpStatusCode.OK)]
    [InlineData("Agent", "GET", "/api/metrics/dashboard", HttpStatusCode.Forbidden)]
    public async Task RoleTier_EndpointAccess_ReturnsExpectedStatusCode(string role, string method, string url, HttpStatusCode expectedStatus)
    {
        // Arrange
        var token = GenerateToken(role);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var request = new HttpRequestMessage(new HttpMethod(method), url);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(expectedStatus, response.StatusCode);
    }
}
