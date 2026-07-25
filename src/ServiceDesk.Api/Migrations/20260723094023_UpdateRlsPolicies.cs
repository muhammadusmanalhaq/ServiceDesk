using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ServiceDesk.Api.Migrations
{
    /// <inheritdoc />
    public partial class UpdateRlsPolicies : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER POLICY department_isolation ON ""Tickets""
                  USING (
                    current_setting('app.current_role', true) = 'Admin'
                    OR ""DepartmentId""::text = current_setting('app.current_department_id', true)
                  );

                ALTER POLICY department_isolation ON ""Assets""
                  USING (
                    current_setting('app.current_role', true) = 'Admin'
                    OR ""DepartmentId""::text = current_setting('app.current_department_id', true)
                  );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER POLICY department_isolation ON ""Tickets""
                  USING (""DepartmentId"" = current_setting('app.current_department_id')::uuid);

                ALTER POLICY department_isolation ON ""Assets""
                  USING (""DepartmentId"" = current_setting('app.current_department_id')::uuid);
            ");
        }
    }
}
