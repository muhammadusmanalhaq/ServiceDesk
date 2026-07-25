using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using ServiceDesk.Api.Data;

namespace ServiceDesk.Api.Services;

/// <summary>
/// Sends transactional emails using MailKit/SMTP.
///
/// Configuration (via user-secrets or Key Vault in production):
///   Email:SmtpHost     — e.g. smtp.brevo.com or smtp.sendgrid.net
///   Email:SmtpPort     — typically 587 (STARTTLS)
///   Email:Username     — SMTP login (Brevo: your account email)
///   Email:Password     — SMTP API key / password
///   Email:FromAddress  — sender address
///   Email:FromName     — sender display name
///   Email:AdminAddress — where breach alerts go (can be a distribution list)
///
/// In development, if Email:SmtpHost is not set, the service logs the email
/// details instead of sending — no SMTP account needed to run locally.
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

    public async Task SendBreachAlertAsync(Guid ticketId)
    {
        await using var db = _dbFactory.CreateSystemContext();

        var ticket = await db.Tickets.FindAsync(ticketId);
        if (ticket == null)
        {
            _logger.LogWarning("SendBreachAlertAsync: ticket {TicketId} not found", ticketId);
            return;
        }

        var subject = $"[SLA BREACH] #{ticket.Id.ToString()[..8]} — {ticket.Title}";
        var body = $"""
            SLA Breach Alert
            ----------------
            Ticket  : {ticket.Title}
            ID      : {ticket.Id}
            Priority: {ticket.Priority}
            Status  : {ticket.Status}
            Deadline: {ticket.SlaDeadline:R}
            
            This ticket has exceeded its SLA deadline. Please review and escalate.
            """;

        await SendEmailAsync(
            to: _config["Email:AdminAddress"] ?? "admin@servicedesk.local",
            subject: subject,
            body: body);
    }

    public async Task SendAssignmentAlertAsync(Guid ticketId, string assignedToUserId)
    {
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

        // If we have the user's email, send directly to them; else fall back to admin
        var toAddress = user?.Email ?? _config["Email:AdminAddress"] ?? "admin@servicedesk.local";
        await SendEmailAsync(to: toAddress, subject: subject, body: body);
    }

    // ─── Private ────────────────────────────────────────────────────────────────

    private async Task SendEmailAsync(string to, string subject, string body)
    {
        var smtpHost = _config["Email:SmtpHost"];

        if (string.IsNullOrWhiteSpace(smtpHost))
        {
            // Dev mode — no SMTP configured, just log the email
            _logger.LogInformation(
                "[DEV EMAIL] To: {To} | Subject: {Subject}\n{Body}",
                to, subject, body);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(
            _config["Email:FromName"] ?? "ServiceDesk",
            _config["Email:FromAddress"] ?? "noreply@servicedesk.local"));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = body };

        using var client = new SmtpClient();
        try
        {
            var port = int.TryParse(_config["Email:SmtpPort"], out var p) ? p : 587;
            await client.ConnectAsync(smtpHost, port, SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(_config["Email:Username"], _config["Email:Password"]);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Email sent: {Subject} → {To}", subject, to);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email: {Subject} → {To}", subject, to);
            // Don't rethrow — a failed email shouldn't crash the application or fail
            // the job. Hangfire will log the exception if needed.
        }
    }
}
