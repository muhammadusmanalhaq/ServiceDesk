using System.ComponentModel.DataAnnotations;

namespace ServiceDesk.Api.DTOs.Auth;

public record RegisterRequest(
    [Required] string FullName,
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password,
    [Required] Guid DepartmentId,
    /// <summary>Must be one of: Admin, Manager, Agent</summary>
    [Required] string Role
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);

/// <summary>
/// Returned on login, register, and token refresh.
/// The access token is short-lived (15 min) and lives in memory on the client.
/// The refresh token travels as an httpOnly cookie — it's never in this payload.
/// </summary>
public record AuthResponse(
    string AccessToken,
    DateTime ExpiresAt,
    string UserId,
    string Email,
    string FullName,
    string Role,
    Guid DepartmentId
);

public record UpdateProfileRequest(
    [Required] string FullName,
    string? AvatarUrl
);
