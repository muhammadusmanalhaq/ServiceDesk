using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServiceDesk.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConvertTimestampColumnsToTimestamptz : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Convert timestamp-without-timezone columns to timestamptz.
            // Npgsql returns timestamptz columns as DateTime with Kind=Utc, which round-trips
            // correctly through System.Text.Json regardless of the global converter.
            // The AT TIME ZONE 'UTC' cast tells Postgres the existing values are already UTC.
            migrationBuilder.Sql(@"
                ALTER TABLE ""Tickets""
                    ALTER COLUMN ""SlaDeadline""  TYPE timestamptz USING ""SlaDeadline""  AT TIME ZONE 'UTC',
                    ALTER COLUMN ""CreatedAt""    TYPE timestamptz USING ""CreatedAt""    AT TIME ZONE 'UTC',
                    ALTER COLUMN ""ClaimedAt""    TYPE timestamptz USING ""ClaimedAt""    AT TIME ZONE 'UTC',
                    ALTER COLUMN ""VerifiedAt""   TYPE timestamptz USING ""VerifiedAt""   AT TIME ZONE 'UTC';

                ALTER TABLE ""AuditLogs""
                    ALTER COLUMN ""Timestamp""    TYPE timestamptz USING ""Timestamp""    AT TIME ZONE 'UTC';

                ALTER TABLE ""Attachments""
                    ALTER COLUMN ""UploadedAt""   TYPE timestamptz USING ""UploadedAt""   AT TIME ZONE 'UTC';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""Tickets""
                    ALTER COLUMN ""SlaDeadline""  TYPE timestamp USING ""SlaDeadline""  AT TIME ZONE 'UTC',
                    ALTER COLUMN ""CreatedAt""    TYPE timestamp USING ""CreatedAt""    AT TIME ZONE 'UTC',
                    ALTER COLUMN ""ClaimedAt""    TYPE timestamp USING ""ClaimedAt""    AT TIME ZONE 'UTC',
                    ALTER COLUMN ""VerifiedAt""   TYPE timestamp USING ""VerifiedAt""   AT TIME ZONE 'UTC';

                ALTER TABLE ""AuditLogs""
                    ALTER COLUMN ""Timestamp""    TYPE timestamp USING ""Timestamp""    AT TIME ZONE 'UTC';

                ALTER TABLE ""Attachments""
                    ALTER COLUMN ""UploadedAt""   TYPE timestamp USING ""UploadedAt""   AT TIME ZONE 'UTC';
            ");
        }
    }
}
