using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServiceDesk.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGrants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                GRANT ALL PRIVILEGES ON ""Notifications"" TO servicedesk_app;
                GRANT ALL PRIVILEGES ON ""TicketComments"" TO servicedesk_app;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                REVOKE ALL PRIVILEGES ON ""Notifications"" FROM servicedesk_app;
                REVOKE ALL PRIVILEGES ON ""TicketComments"" FROM servicedesk_app;
            ");
        }
    }
}
