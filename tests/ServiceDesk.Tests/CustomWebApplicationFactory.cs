using System.Data.Common;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using ServiceDesk.Api.Data;
using Testcontainers.PostgreSql;
using Xunit;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using System;

namespace ServiceDesk.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .WithDatabase("servicedesk")
        .Build();

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();

        var superuserConnStr = _dbContainer.GetConnectionString();

        // 1. Create Roles
        await using var conn = new NpgsqlConnection(superuserConnStr);
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            CREATE ROLE servicedesk_app WITH LOGIN PASSWORD 'testapppass';
            CREATE ROLE servicedesk_system WITH LOGIN PASSWORD 'systempass' BYPASSRLS;
        ";
        await cmd.ExecuteNonQueryAsync();

        // 2. Run EF Migrations
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(superuserConnStr);
        await using var dbContext = new AppDbContext(optionsBuilder.Options, new HttpContextAccessor());
        await dbContext.Database.MigrateAsync();
        
        cmd.CommandText = @"
            CREATE SCHEMA IF NOT EXISTS hangfire AUTHORIZATION servicedesk_system;
            GRANT ALL PRIVILEGES ON SCHEMA hangfire TO servicedesk_system, servicedesk_app;
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hangfire TO servicedesk_system, servicedesk_app;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hangfire TO servicedesk_system, servicedesk_app;
            ALTER DEFAULT PRIVILEGES IN SCHEMA hangfire GRANT ALL PRIVILEGES ON TABLES TO servicedesk_system, servicedesk_app;
            ALTER DEFAULT PRIVILEGES IN SCHEMA hangfire GRANT ALL PRIVILEGES ON SEQUENCES TO servicedesk_system, servicedesk_app;
        ";
        await cmd.ExecuteNonQueryAsync();

        // 3. Grant Permissions
        cmd.CommandText = @"
            GRANT CONNECT ON DATABASE servicedesk TO servicedesk_app, servicedesk_system;
            GRANT CREATE ON DATABASE servicedesk TO servicedesk_system;
            GRANT USAGE ON SCHEMA public TO servicedesk_app, servicedesk_system;
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO servicedesk_app, servicedesk_system;
            GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO servicedesk_app, servicedesk_system;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO servicedesk_app, servicedesk_system;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO servicedesk_app, servicedesk_system;
        ";
        await cmd.ExecuteNonQueryAsync();

        // 4. Set Environment Variables for Program.cs (runs before WebApplication.CreateBuilder)
        var builderApp = new NpgsqlConnectionStringBuilder(superuserConnStr)
        {
            Username = "servicedesk_app",
            Password = "testapppass"
        };
        var builderSystem = new NpgsqlConnectionStringBuilder(superuserConnStr)
        {
            Username = "servicedesk_system",
            Password = "systempass"
        };

        Environment.SetEnvironmentVariable("ConnectionStrings__Default", builderApp.ToString());
        Environment.SetEnvironmentVariable("ConnectionStrings__System", builderSystem.ToString());
        Environment.SetEnvironmentVariable("Jwt__Key", "Test-SuperSecretKey-AtLeast32Characters-2026!");
    }

    public new async Task DisposeAsync()
    {
        await _dbContainer.DisposeAsync();
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", null);
        Environment.SetEnvironmentVariable("ConnectionStrings__System", null);
    }
}
