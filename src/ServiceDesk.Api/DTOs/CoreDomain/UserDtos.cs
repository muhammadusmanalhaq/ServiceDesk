using System;

namespace ServiceDesk.Api.DTOs.CoreDomain;

public record UserResponse(
    string Id,
    string FullName,
    string? AvatarUrl
);
