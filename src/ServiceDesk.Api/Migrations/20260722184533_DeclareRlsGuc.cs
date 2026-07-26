using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServiceDesk.Api.Migrations
{
    /// <inheritdoc />
    public partial class DeclareRlsGuc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Postgres requires custom GUC parameters (app.*) to be pre-declared at the database
            // level before SET LOCAL can use them. Without this, any new connection attempting
            // SET LOCAL app.current_department_id = '...' raises:
            //   42704: unrecognized configuration parameter "app.current_department_id"
            //
            // ALTER DATABASE SET declares the parameter with an empty default, making it
            // recognised on every subsequent connection to this database.
            migrationBuilder.Sql(
                "DO $$ BEGIN EXECUTE 'ALTER DATABASE ' || quote_ident(current_database()) || ' SET \"app.current_department_id\" = '''''; END $$;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DO $$ BEGIN EXECUTE 'ALTER DATABASE ' || quote_ident(current_database()) || ' RESET \"app.current_department_id\"'; END $$;");
        }
    }
}
