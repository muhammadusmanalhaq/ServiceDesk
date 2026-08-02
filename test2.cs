using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder().AddJsonFile("appsettings.json", optional: true).AddEnvironmentVariables().Build();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql("Host=ep-weathered-lab-azuk8qk5-pooler.c-3.ap-southeast-1.aws.neon.tech;Database=neondb;Username=neondb_owner;Password=npg_Vfmw49QETicC;Ssl Mode=Require;"));
        var provider = services.BuildServiceProvider();
        var db = provider.GetRequiredService<AppDbContext>();

        var tickets = await db.Tickets.ToListAsync();
        Console.WriteLine($"Total tickets found: {tickets.Count}");
    }
}
