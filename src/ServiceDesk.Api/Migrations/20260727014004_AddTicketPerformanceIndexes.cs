using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServiceDesk.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Tickets_Status",
                table: "Tickets",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tickets_Status",
                table: "Tickets");
        }
    }
}
