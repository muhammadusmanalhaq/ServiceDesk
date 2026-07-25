using System.ComponentModel.DataAnnotations;

namespace ServiceDesk.Api.DTOs.CoreDomain;

public record AssetResponse(Guid Id, string Name, string Status, Guid DepartmentId);

public record CreateAssetRequest
{
    [Required, StringLength(100)]
    public string Name { get; init; } = "";
    
    [Required]
    public string Status { get; init; } = "Active";
}

public record UpdateAssetRequest
{
    [Required, StringLength(100)]
    public string Name { get; init; } = "";
    
    [Required]
    public string Status { get; init; } = "";
}
