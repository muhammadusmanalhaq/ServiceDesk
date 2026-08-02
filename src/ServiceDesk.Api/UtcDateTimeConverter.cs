using System.Text.Json;
using System.Text.Json.Serialization;

namespace ServiceDesk.Api;

/// <summary>
/// Global System.Text.Json converter that ensures every DateTime value is
/// serialized as UTC regardless of its DateTimeKind.
///
/// Npgsql reads Postgres timestamp-without-timezone columns back as DateTime
/// with Kind=Unspecified.  STJ's default serializer omits the trailing 'Z'
/// for Unspecified-kind values, so the frontend's Date.parse() treats them
/// as local time rather than UTC — causing SLA deadlines to appear wrong by
/// exactly the browser's UTC offset.
///
/// Registering this converter globally via AddJsonOptions() fixes the issue
/// at the serialization layer for every endpoint and every DateTime field in
/// one place, with no per-DTO changes required.
/// </summary>
public sealed class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var dt = reader.GetDateTime();
        // If the value arrives without timezone info, assume UTC
        return dt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : dt.ToUniversalTime();
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        // Normalize Unspecified → UTC before serializing so STJ always appends 'Z'
        var utc = value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
        writer.WriteStringValue(utc);
    }
}

/// <summary>
/// Nullable variant — required because STJ does not automatically apply
/// non-nullable converters to their nullable counterparts.
/// </summary>
public sealed class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        var dt = reader.GetDateTime();
        return dt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : dt.ToUniversalTime();
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null) { writer.WriteNullValue(); return; }
        var utc = value.Value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
            : value.Value.ToUniversalTime();
        writer.WriteStringValue(utc);
    }
}
