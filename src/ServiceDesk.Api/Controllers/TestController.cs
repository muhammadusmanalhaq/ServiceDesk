using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Hangfire;
using ServiceDesk.Api.Services;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/test")]
[Authorize(Roles = "Admin")]
public class TestController : ControllerBase
{
    [HttpPost("trigger-sla")]
    public IActionResult TriggerSla()
    {
        BackgroundJob.Enqueue<SlaCheckJob>(j => j.RunAsync());
        return Ok("Job triggered");
    }
}
