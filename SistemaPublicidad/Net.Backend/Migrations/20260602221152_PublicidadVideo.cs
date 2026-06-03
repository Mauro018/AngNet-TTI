using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Net.Backend.Migrations
{
    /// <inheritdoc />
    public partial class PublicidadVideo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VideoNombreArchivo",
                table: "Publicidades",
                type: "character varying(260)",
                maxLength: 260,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VideoNombreArchivo",
                table: "Publicidades");
        }
    }
}
