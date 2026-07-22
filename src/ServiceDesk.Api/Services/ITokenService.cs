using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Services;

public interface ITokenService
{
    /// <summary>Generates a signed JWT access token (15-minute lifetime).</summary>
    string GenerateAccessToken(ApplicationUser user, string role);

    /// <summary>Generates a cryptographically random 64-byte refresh token (raw).</summary>
    string GenerateRefreshToken();

    /// <summary>SHA-256 hex hash of a token — what we store in the DB.</summary>
    string HashToken(string token);
}
