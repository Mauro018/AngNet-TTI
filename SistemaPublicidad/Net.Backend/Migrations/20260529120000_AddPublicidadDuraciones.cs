using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Net.Backend.Migrations
{
    public partial class AddPublicidadDuraciones : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DuracionMeses",
                table: "Publicidades",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "DuracionVideoSegundos",
                table: "Publicidades",
                type: "integer",
                nullable: false,
                defaultValue: 10);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DuracionMeses",
                table: "Publicidades");

            migrationBuilder.DropColumn(
                name: "DuracionVideoSegundos",
                table: "Publicidades");
        }
    }
}