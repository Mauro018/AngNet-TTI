using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Net.Backend.Migrations
{
    /// <inheritdoc />
    public partial class EmpresaCedula : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cedula",
                table: "Empresas",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Cedula",
                table: "Empresas");
        }
    }
}
