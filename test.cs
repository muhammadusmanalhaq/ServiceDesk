using System;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        var connStr = "Host=ep-weathered-lab-azuk8qk5-pooler.c-3.ap-southeast-1.aws.neon.tech;Database=neondb;Username=neondb_owner;Password=npg_Vfmw49QETicC;Ssl Mode=Require;";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connStr)
            .Options;

        using var db = new AppDbContext(options, null);
        var ticket = await db.Tickets.FirstOrDefaultAsync(t => t.Id == Guid.Parse("d81358c2-67a3-4c1a-97f3-c0bc9c2a8008"));
        
        Console.WriteLine($"Found ticket: {ticket?.TicketNumber}");
        
        var tickets = await db.Tickets.ToListAsync();
        Console.WriteLine($"Total tickets found: {tickets.Count}");
    }
}
