using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.DTOs.Auth;
using ServiceDesk.Api.Models;
using ServiceDesk.Api.Services;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private static readonly string[] ValidRoles = ["Admin", "Manager", "Agent"];

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly AppDbContext _db;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        AppDbContext db,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _db = db;
        _logger = logger;
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Register a new user. In production, only an Admin would call this
    /// for Manager/Agent roles — the open registration is for development convenience.
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (!ValidRoles.Contains(request.Role))
            return BadRequest(new { error = $"Role must be one of: {string.Join(", ", ValidRoles)}" });

        var department = await _db.Departments.FindAsync(request.DepartmentId);
        if (department is null)
            return BadRequest(new { error = "Department not found.", hint = "Use GET /api/departments to list valid department IDs." });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            DepartmentId = request.DepartmentId
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        await _userManager.AddToRoleAsync(user, request.Role);

        var (accessToken, refreshToken) = await IssueAndPersistTokenPair(user, request.Role);
        SetRefreshTokenCookie(refreshToken);

        return CreatedAtAction(nameof(Register), BuildAuthResponse(user, accessToken, request.Role));
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    [HttpPost("login")]
    [EnableRateLimiting("AuthLimiter")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
            // Intentionally vague — don't hint which part was wrong
            return Unauthorized(new { error = "Invalid credentials." });

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Agent";

        var (accessToken, refreshToken) = await IssueAndPersistTokenPair(user, role);
        SetRefreshTokenCookie(refreshToken);

        return Ok(BuildAuthResponse(user, accessToken, role));
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Exchange a valid refresh token (from the httpOnly cookie) for a new access
    /// token + rotated refresh token. The old refresh token is revoked immediately.
    ///
    /// Why rotation matters: if the old token is ever presented again after rotation,
    /// it means it was stolen and used after the legitimate client already refreshed.
    /// That's the signal to revoke the entire token family (future hardening).
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh()
    {
        var rawToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(rawToken))
            return Unauthorized(new { error = "No refresh token present." });

        var hash = _tokenService.HashToken(rawToken);
        var stored = await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash);

        if (stored is null)
            return Unauthorized(new { error = "Refresh token is invalid or expired." });

        if (!stored.IsActive)
        {
            _logger.LogWarning("Token reuse detected for user {UserId}. Revoking entire token family.", stored.UserId);
            var familyTokens = await _db.RefreshTokens.Where(rt => rt.UserId == stored.UserId).ToListAsync();
            foreach (var rt in familyTokens)
            {
                rt.Revoked = true;
            }
            await _db.SaveChangesAsync();
            return Unauthorized(new { error = "Refresh token is invalid or expired." });
        }

        // Revoke the old token BEFORE issuing a new one.
        // IssueAndPersistTokenPair will SaveChangesAsync, persisting the revocation
        // and the new token in the same round-trip.
        stored.Revoked = true;

        var roles = await _userManager.GetRolesAsync(stored.User);
        var role = roles.FirstOrDefault() ?? "Agent";

        var (accessToken, newRefreshToken) = await IssueAndPersistTokenPair(stored.User, role);
        SetRefreshTokenCookie(newRefreshToken);

        return Ok(BuildAuthResponse(stored.User, accessToken, role));
    }

    // ─── Revoke (logout) ─────────────────────────────────────────────────────

    [HttpPost("revoke")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Revoke()
    {
        var rawToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(rawToken))
        {
            var hash = _tokenService.HashToken(rawToken);
            var stored = await _db.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == hash);
            if (stored is not null)
            {
                stored.Revoked = true;
                await _db.SaveChangesAsync();
            }
        }

        Response.Cookies.Delete("refreshToken");
        return NoContent();
    }

    // ─── Profile ─────────────────────────────────────────────────────────────

    [HttpPut("profile")]
    [Authorize]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return NotFound();

        user.FullName = request.FullName;
        user.AvatarUrl = request.AvatarUrl;

        await _userManager.UpdateAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Agent";
        var accessToken = _tokenService.GenerateAccessToken(user, role);

        return Ok(BuildAuthResponse(user, accessToken, role));
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private async Task<(string AccessToken, string RawRefreshToken)> IssueAndPersistTokenPair(
        ApplicationUser user, string role)
    {
        var accessToken = _tokenService.GenerateAccessToken(user, role);
        var rawRefresh = _tokenService.GenerateRefreshToken();

        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = _tokenService.HashToken(rawRefresh),
            Expires = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        });

        // Single SaveChangesAsync covers: new refresh token + any pending revocations
        await _db.SaveChangesAsync();

        return (accessToken, rawRefresh);
    }

    private void SetRefreshTokenCookie(string rawRefreshToken)
    {
        Response.Cookies.Append("refreshToken", rawRefreshToken, new CookieOptions
        {
            HttpOnly = true,                  // JS cannot read this
            Secure = false,                   // Set to true in production (requires HTTPS)
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }

    private static AuthResponse BuildAuthResponse(ApplicationUser user, string accessToken, string role) =>
        new(
            AccessToken: accessToken,
            ExpiresAt: DateTime.UtcNow.AddMinutes(15),
            UserId: user.Id,
            Email: user.Email!,
            FullName: user.FullName,
            Role: role,
            DepartmentId: user.DepartmentId
        );
}
