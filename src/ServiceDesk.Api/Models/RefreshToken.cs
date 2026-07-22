namespace ServiceDesk.Api.Models;

/// <summary>
/// Stores a SHA-256 hash of the refresh token — never the raw token.
/// The raw token is issued once to the client and never persisted in plaintext.
///
/// IsActive drives the validity check: a token is valid only if it hasn't been
/// revoked AND hasn't passed its expiry. Both conditions must hold.
/// </summary>
public class RefreshToken
{
    public Guid Id { get; set; }

    /// <summary>SHA-256 hex hash of the raw refresh token sent to the client.</summary>
    public string TokenHash { get; set; } = "";

    public string UserId { get; set; } = "";
    public ApplicationUser User { get; set; } = null!;

    public DateTime Expires { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>Set to true on revocation (logout or token rotation).</summary>
    public bool Revoked { get; set; }

    /// <summary>
    /// Token rotation: when /refresh is called, the old token is revoked here
    /// and a new one is issued. If a revoked token is ever presented again, it
    /// means the token was stolen — at which point we can revoke the entire family.
    /// (That family-revocation step is a future hardening; this flag is the hook.)
    /// </summary>
    public bool IsActive => !Revoked && DateTime.UtcNow < Expires;
}
