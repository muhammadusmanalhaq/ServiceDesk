using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ServiceDesk.Api.Controllers;

/// <summary>
/// Throwaway endpoints for verifying RBAC during Milestone 2.
/// Used to prove the three failure modes without needing a frontend:
///   - No token       → 401 Unauthorized
///   - Wrong role     → 403 Forbidden
///   - Correct role   → 200 OK
///
/// These will be deleted once Milestone 3 real endpoints exist.
/// </summary>
[ApiController]
[Route("api/test")]
[Produces("application/json")]
public class TestController : ControllerBase
{
    /// <summary>Requires a valid JWT regardless of role. No token → 401.</summary>
    [HttpGet("authenticated")]
    [Authorize]
    public IActionResult AuthenticatedOnly()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role);
        var deptId = User.FindFirstValue("department_id");

        return Ok(new
        {
            message = "Token is valid.",
            userId,
            role,
            departmentId = deptId
        });
    }

    /// <summary>Requires Admin role. Valid token + wrong role → 403.</summary>
    [HttpGet("admin-only")]
    [Authorize(Roles = "Admin")]
    public IActionResult AdminOnly() =>
        Ok(new { message = "You are an Admin." });

    /// <summary>Requires Manager or Admin role.</summary>
    [HttpGet("manager-or-admin")]
    [Authorize(Roles = "Manager,Admin")]
    public IActionResult ManagerOrAdmin() =>
        Ok(new { message = "You are a Manager or Admin." });

    /// <summary>Public — no token needed. Baseline to confirm the API is up.</summary>
    [HttpGet("public")]
    [AllowAnonymous]
    public IActionResult Public() =>
        Ok(new { message = "No auth required." });
}
