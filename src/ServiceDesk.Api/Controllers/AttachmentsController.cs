using Azure.Storage.Blobs;
using Azure.Storage.Sas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.Models;
using System.Security.Claims;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/attachments")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _cache;
    
    public AttachmentsController(AppDbContext db, IConfiguration config, Microsoft.Extensions.Caching.Memory.IMemoryCache cache)
    {
        _db = db;
        _config = config;
        _cache = cache;
    }

    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

    private Guid CurrentDepartmentId =>
        Guid.Parse(User.FindFirstValue("department_id") ?? Guid.Empty.ToString());

    [HttpPost("generate-sas")]
    public IActionResult GenerateSas([FromBody] GenerateSasRequest request)
    {
        var connectionString = _config["AzureWebJobsStorage"] ?? _config["Storage:ConnectionString"];
        if (string.IsNullOrEmpty(connectionString))
        {
            // For local development without Azurite, we can't easily generate SAS.
            // A real app would return an error or use Azurite.
            return BadRequest(new { error = "Storage is not configured." });
        }

        var blobServiceClient = new BlobServiceClient(connectionString);
        var containerClient = blobServiceClient.GetBlobContainerClient("attachments");
        containerClient.CreateIfNotExists();

        var blobName = $"{Guid.NewGuid()}-{request.FileName}";
        var blobClient = containerClient.GetBlobClient(blobName);

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = containerClient.Name,
            BlobName = blobClient.Name,
            Resource = "b",
            StartsOn = DateTimeOffset.UtcNow.AddMinutes(-5),
            ExpiresOn = DateTimeOffset.UtcNow.AddHours(1),
        };

        sasBuilder.SetPermissions(BlobSasPermissions.Write | BlobSasPermissions.Create);

        var sasUri = blobClient.GenerateSasUri(sasBuilder);

        return Ok(new
        {
            sasUrl = sasUri.ToString(),
            blobPath = blobName
        });
    }

    [HttpPost("register")]
    public async Task<IActionResult> RegisterAttachment([FromBody] RegisterAttachmentRequest request)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        var ticket = await _db.Tickets.FindAsync(request.TicketId);
        if (ticket == null)
        {
            return NotFound(new { error = "Ticket not found." });
        }

        var attachment = new Attachment
        {
            Id = Guid.NewGuid(),
            TicketId = request.TicketId,
            BlobPath = request.BlobPath,
            FileName = request.FileName,
            UploadedByUserId = CurrentUserId,
            UploadedAt = DateTime.UtcNow
        };

        _db.Attachments.Add(attachment);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        _cache.Remove($"Tickets_{CurrentDepartmentId}");

        return Ok(attachment);
    }

    [HttpGet("{id:guid}/download-sas")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDownloadSas(Guid id)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();

        // RLS scopes this query to the current user's department automatically
        var attachment = await _db.Attachments.FindAsync(id);

        await transaction.CommitAsync();

        if (attachment == null) return NotFound(new { error = "Attachment not found." });

        var connectionString = _config["AzureWebJobsStorage"] ?? _config["Storage:ConnectionString"];
        if (string.IsNullOrEmpty(connectionString))
        {
            return BadRequest(new { error = "Storage is not configured." });
        }

        var blobServiceClient = new BlobServiceClient(connectionString);
        var containerClient = blobServiceClient.GetBlobContainerClient("attachments");
        var blobClient = containerClient.GetBlobClient(attachment.BlobPath);

        var sasBuilder = new BlobSasBuilder
        {
            BlobContainerName = containerClient.Name,
            BlobName = blobClient.Name,
            Resource = "b",
            StartsOn  = DateTimeOffset.UtcNow.AddMinutes(-2),
            ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(10),
        };

        sasBuilder.SetPermissions(BlobSasPermissions.Read);

        var sasUri = blobClient.GenerateSasUri(sasBuilder);

        return Ok(new
        {
            sasUrl   = sasUri.ToString(),
            fileName = attachment.FileName
        });
    }
}

public class GenerateSasRequest
{
    public string FileName { get; set; } = "";
}

public class RegisterAttachmentRequest
{
    public Guid TicketId { get; set; }
    public string BlobPath { get; set; } = "";
    public string FileName { get; set; } = "";
}
