using FluentValidation;
using ServiceDesk.Api.DTOs.CoreDomain;

namespace ServiceDesk.Api.Validators;

public class CreateAssetRequestValidator : AbstractValidator<CreateAssetRequest>
{
    private static readonly string[] ValidStatuses = ["Active", "Inactive", "Maintenance", "Retired"];

    public CreateAssetRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(s => ValidStatuses.Contains(s))
            .WithMessage("Status must be one of: Active, Inactive, Maintenance, Retired.");
    }
}

public class UpdateAssetRequestValidator : AbstractValidator<UpdateAssetRequest>
{
    private static readonly string[] ValidStatuses = ["Active", "Inactive", "Maintenance", "Retired"];

    public UpdateAssetRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(s => ValidStatuses.Contains(s))
            .WithMessage("Status must be one of: Active, Inactive, Maintenance, Retired.");
    }
}
