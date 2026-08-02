using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ServiceDesk.Api.Hubs;

[Authorize]
public class TicketHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var departmentId = Context.User?.FindFirst("department_id")?.Value;
        if (!string.IsNullOrEmpty(departmentId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, departmentId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var departmentId = Context.User?.FindFirst("department_id")?.Value;
        if (!string.IsNullOrEmpty(departmentId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, departmentId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
