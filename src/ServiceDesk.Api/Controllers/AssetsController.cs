using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.Api.Data;
using ServiceDesk.Api.DTOs.CoreDomain;
using ServiceDesk.Api.Models;

namespace ServiceDesk.Api.Controllers;

[ApiController]
[Route("api/assets")]
[Authorize]
[Produces("application/json")]
public class AssetsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AssetsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid CurrentDepartmentId => 
        Guid.Parse(User.FindFirstValue("department_id") ?? Guid.Empty.ToString());

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<AssetResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        // Explicit transaction for read operations ensures SET LOCAL in interceptor is safely scoped
        await using var transaction = await _db.Database.BeginTransactionAsync();
        
        var assets = await _db.Assets
            .Select(a => new AssetResponse(a.Id, a.Name, a.Status, a.DepartmentId))
            .ToListAsync();
            
        await transaction.CommitAsync();
        return Ok(assets);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AssetResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        
        var asset = await _db.Assets.FindAsync(id);
        
        await transaction.CommitAsync();

        if (asset == null) return NotFound();

        return Ok(new AssetResponse(asset.Id, asset.Name, asset.Status, asset.DepartmentId));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(AssetResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateAssetRequest request)
    {
        // Must open transaction explicitly so RlsTransactionInterceptor fires SET LOCAL before the INSERT.
        await using var transaction = await _db.Database.BeginTransactionAsync();

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Status = request.Status,
            DepartmentId = CurrentDepartmentId // Always tie to creator's department
        };

        _db.Assets.Add(asset);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return CreatedAtAction(nameof(GetById), new { id = asset.Id }, 
            new AssetResponse(asset.Id, asset.Name, asset.Status, asset.DepartmentId));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(AssetResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, UpdateAssetRequest request)
    {
        // Must read within transaction for RLS
        await using var transaction = await _db.Database.BeginTransactionAsync();
        
        var asset = await _db.Assets.FindAsync(id);
        if (asset == null) 
        {
            await transaction.CommitAsync();
            return NotFound();
        }

        asset.Name = request.Name;
        asset.Status = request.Status;

        // Commit transaction after saving changes
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new AssetResponse(asset.Id, asset.Name, asset.Status, asset.DepartmentId));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync();
        
        var asset = await _db.Assets.FindAsync(id);
        if (asset == null) 
        {
            await transaction.CommitAsync();
            return NotFound();
        }

        _db.Assets.Remove(asset);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return NoContent();
    }
}
