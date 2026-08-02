using System.Diagnostics;
using Azure;
using Azure.Communication.Email;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Services;

/// <summary>
/// Sends transactional emails using Azure Communication Services (ACS).
///
/// Configuration (via user-secrets or Key Vault in production):
///   Email:AcsConnectionString — from Azure portal
///   Email:FromAddress         — e.g. DoNotReply@something.azurecomm.net
///   Email:AdminAddress        — where breach alerts go (can be a distribution list)
///   Frontend:Url              — e.g. https://service-desk-mauve.vercel.app
///
/// In development, if AcsConnectionString is not set, it logs the email to console.
/// In all cases, it writes an AuditLog entry (sent or failed).
/// </summary>
public class EmailNotificationService : INotificationService
{
    private readonly SystemDbContextFactory _dbFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<EmailNotificationService> _logger;

    public EmailNotificationService(
        SystemDbContextFactory dbFactory,
        IConfiguration config,
        ILogger<EmailNotificationService> logger)
    {
        _dbFactory = dbFactory;
        _config = config;
        _logger = logger;
    }

    public async Task SendBreachAlertAsync(Guid ticketId, string? parentTraceId)
    {
        using var activity = parentTraceId != null 
            ? SlaCheckJob.ActivitySource.StartActivity("EmailNotificationService.SendBreachAlert", ActivityKind.Internal, parentTraceId)
            : SlaCheckJob.ActivitySource.StartActivity("EmailNotificationService.SendBreachAlert", ActivityKind.Internal);

        await using var db = _dbFactory.CreateSystemContext();

        var ticket = await db.Tickets.FindAsync(ticketId);
        if (ticket == null)
        {
            _logger.LogWarning("SendBreachAlertAsync: ticket {TicketId} not found", ticketId);
            return;
        }

        var subject = $"[SLA BREACH] #{ticket.Id.ToString()[..8]} — {ticket.Title}";
        
        var appUrl = _config["Frontend:Url"] ?? "http://localhost:3000";
        var link = $"{appUrl}/tickets?search={ticket.Id}";
        
        var diff = DateTime.UtcNow - ticket.SlaDeadline;
        var hoursPast = Math.Max(0, (int)diff.TotalHours);

        var body = $"""
            SLA Breach Alert
            ----------------
            Ticket  : {ticket.Title}
            ID      : {ticket.Id}
            Priority: {ticket.Priority}
            Status  : {ticket.Status}
            Past Due: {hoursPast} hours
            
            This ticket has exceeded its SLA deadline. Please review and escalate immediately.
            
            View Ticket: {link}
            """;

        var toAddress = _config["Email:AdminAddress"] ?? "admin@servicedesk.local";

        if (!string.IsNullOrEmpty(ticket.AssignedToUserId))
        {
            var user = await db.Users.FindAsync(ticket.AssignedToUserId);
            if (user != null && !string.IsNullOrEmpty(user.Email))
            {
                toAddress = user.Email;
            }
        }

        await SendEmailAsync(db, ticket.Id.ToString(), toAddress, subject, body);
    }

    public async Task SendAssignmentAlertAsync(Guid ticketId, string assignedToUserId, string? parentTraceId)
    {
        using var activity = parentTraceId != null 
            ? SlaCheckJob.ActivitySource.StartActivity("EmailNotificationService.SendAssignmentAlert", ActivityKind.Internal, parentTraceId)
            : SlaCheckJob.ActivitySource.StartActivity("EmailNotificationService.SendAssignmentAlert", ActivityKind.Internal);

        await using var db = _dbFactory.CreateSystemContext();

        var ticket = await db.Tickets.FindAsync(ticketId);
        var user = await db.Users.FindAsync(assignedToUserId);

        if (ticket == null) return;

        var subject = $"[Assigned to You] #{ticket.Id.ToString()[..8]} — {ticket.Title}";
        var body = $"""
            Ticket Assignment
            -----------------
            Hi {user?.FullName ?? "Agent"},
            
            Ticket '{ticket.Title}' (Priority: {ticket.Priority}) has been assigned to you.
            SLA Deadline: {ticket.SlaDeadline:R}
            
            Please log in to ServiceDesk to review and begin work.
            """;

        var toAddress = user?.Email ?? _config["Email:AdminAddress"] ?? "admin@servicedesk.local";
        await SendEmailAsync(db, ticket.Id.ToString(), toAddress, subject, body);
    }

    private async Task SendEmailAsync(AppDbContext db, string entityId, string to, string subject, string body)
    {
        var connectionString = _config["Email:AcsConnectionString"];
        var senderAddress = _config["Email:FromAddress"] ?? "DoNotReply@local.azurecomm.net";

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            _logger.LogInformation(
                "[DEV EMAIL] To: {To} | Subject: {Subject}\n{Body}",
                to, subject, body);
            
            db.AuditLogs.Add(new AuditLog
            {
                EntityName = "Email",
                EntityId = entityId,
                Action = "Email Logged (Dev Mode)",
                Timestamp = DateTime.UtcNow,
                ChangedByUserId = "system",
                NewValues = System.Text.Json.JsonSerializer.Serialize(new { to, subject })
            });
            await db.SaveChangesAsync();
            return;
        }

        try
        {
            var emailClient = new EmailClient(connectionString);
            
            var emailMessage = new EmailMessage(
                senderAddress: senderAddress,
                recipientAddress: to,
                content: new EmailContent(subject)
                {
                    PlainText = body
                });

            var operation = await emailClient.SendAsync(WaitUntil.Started, emailMessage);
            _logger.LogInformation("Email sent: {Subject} → {To} (OperationId: {OperationId})", subject, to, operation.Id);

            db.AuditLogs.Add(new AuditLog
            {
                EntityName = "Email",
                EntityId = entityId,
                Action = "Email Sent",
                Timestamp = DateTime.UtcNow,
                ChangedByUserId = "system",
                NewValues = System.Text.Json.JsonSerializer.Serialize(new { to, subject, status = "Sent", operationId = operation.Id })
            });
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email: {Subject} → {To}", subject, to);
            
            db.AuditLogs.Add(new AuditLog
            {
                EntityName = "Email",
                EntityId = entityId,
                Action = "Email Failed",
                Timestamp = DateTime.UtcNow,
                ChangedByUserId = "system",
                NewValues = System.Text.Json.JsonSerializer.Serialize(new { to, subject, error = ex.Message })
            });
            await db.SaveChangesAsync();
        }
    }
}
