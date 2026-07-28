using FluentValidation;
using ServiceDesk.Api.DTOs.CoreDomain;
using ServiceDesk.Api.Controllers; // for RegisterAttachmentRequest

namespace ServiceDesk.Api.Validators;

public class CreateTicketRequestValidator : AbstractValidator<CreateTicketRequest>
{
    public CreateTicketRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty();
        RuleFor(x => x.AssetId).NotEmpty();
        RuleFor(x => x.Priority).Must(p => new[] { "Low", "Medium", "High", "Critical" }.Contains(p))
            .WithMessage("Priority must be Low, Medium, High, or Critical.");
    }
}

public class RegisterAttachmentRequestValidator : AbstractValidator<RegisterAttachmentRequest>
{
    public RegisterAttachmentRequestValidator()
    {
        RuleFor(x => x.TicketId).NotEmpty();
        RuleFor(x => x.BlobPath).NotEmpty();
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(255);
    }
}
