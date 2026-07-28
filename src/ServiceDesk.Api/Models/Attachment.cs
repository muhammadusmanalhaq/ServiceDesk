using System.Text.Json.Serialization;

namespace ServiceDesk.Api.Models;

public class Attachment
{
    public Guid Id { get; set; }
    
    public Guid TicketId { get; set; }
    
    [JsonIgnore]
    public Ticket Ticket { get; set; } = null!;
    
    public string BlobPath { get; set; } = "";
    
    public string FileName { get; set; } = "";
    
    public string UploadedByUserId { get; set; } = "";
    
    [JsonIgnore]
    public ApplicationUser UploadedByUser { get; set; } = null!;
    
    public DateTime UploadedAt { get; set; }
}
