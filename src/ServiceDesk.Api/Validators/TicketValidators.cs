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

public class UpdateTicketStatusRequestValidator : AbstractValidator<UpdateTicketStatusRequest>
{
    private static readonly string[] ValidStatuses =
        ["Open", "InProgress", "PendingVerification", "Resolved", "Closed"];

    public UpdateTicketStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(s => ValidStatuses.Contains(s))
            .WithMessage("Status must be one of: Open, InProgress, PendingVerification, Resolved, Closed.");
    }
}

public class AssignTicketRequestValidator : AbstractValidator<AssignTicketRequest>
{
    public AssignTicketRequestValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}

public class ClaimTicketRequestValidator : AbstractValidator<ClaimTicketRequest>
{
    public ClaimTicketRequestValidator()
    {
        RuleFor(x => x.ResolutionNote).MaximumLength(2000);
    }
}

public class VerifyTicketRequestValidator : AbstractValidator<VerifyTicketRequest>
{
    public VerifyTicketRequestValidator()
    {
        // ResolutionNote is mandatory when rejecting (Accept = false)
        RuleFor(x => x.ResolutionNote)
            .NotEmpty()
            .When(x => !x.Accept)
            .WithMessage("ResolutionNote is required when rejecting a claim.");
        RuleFor(x => x.ResolutionNote).MaximumLength(2000);
    }
}
