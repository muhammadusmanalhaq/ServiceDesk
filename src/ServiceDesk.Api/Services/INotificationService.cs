namespace ServiceDesk.Api.Services;

/// <summary>
/// Sends notifications for ticket-related events.
/// Kept behind an interface so tests can inject a no-op fake instead
/// of actually sending email during dotnet test.
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Notifies relevant parties that a ticket has breached its SLA deadline.
    /// Called by the SLA background job after marking SlaBreached = true.
    /// </summary>
    Task SendBreachAlertAsync(Guid ticketId);

    /// <summary>
    /// Notifies the assigned agent when a ticket is assigned to them.
    /// Called from TicketsController.Assign.
    /// </summary>
    Task SendAssignmentAlertAsync(Guid ticketId, string assignedToUserId);
}
