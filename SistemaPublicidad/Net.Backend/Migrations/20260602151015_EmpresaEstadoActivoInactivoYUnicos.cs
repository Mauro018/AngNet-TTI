using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Net.Backend.Migrations
{
    /// <inheritdoc />
    public partial class EmpresaEstadoActivoInactivoYUnicos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Pendiente",
                table: "Empresas");

            migrationBuilder.DropColumn(
                name: "Suspendido",
                table: "Empresas");

            migrationBuilder.CreateIndex(
                name: "IX_Empresas_Nit",
                table: "Empresas",
                column: "Nit",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Empresas_Telefono",
                table: "Empresas",
                column: "Telefono",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Empresas_Nit",
                table: "Empresas");

            migrationBuilder.DropIndex(
                name: "IX_Empresas_Telefono",
                table: "Empresas");

            migrationBuilder.AddColumn<bool>(
                name: "Pendiente",
                table: "Empresas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Suspendido",
                table: "Empresas",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
