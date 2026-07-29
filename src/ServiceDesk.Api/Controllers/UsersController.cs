using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.DTOs.CoreDomain;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/users")]
[Produces("application/json")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public UsersController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var departmentIdStr = User.FindFirstValue("department_id");
        if (!Guid.TryParse(departmentIdStr, out var departmentId))
            return Unauthorized();

        var isAdmin = User.IsInRole("Admin");

        var query = _userManager.Users.AsQueryable();
        
        // Scope to department unless Admin
        if (!isAdmin)
        {
            query = query.Where(u => u.DepartmentId == departmentId);
        }

        var users = await query
            .Select(u => new UserResponse(u.Id, u.FullName, u.AvatarUrl))
            .ToListAsync();

        return Ok(users);
    }
}
