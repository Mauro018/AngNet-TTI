using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Net.Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPrecios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Precios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TipoPantalla = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DuracionSegundos = table.Column<int>(type: "integer", nullable: false),
                    PrecioMensual = table.Column<long>(type: "bigint", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Precios", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Precios_TipoPantalla_DuracionSegundos",
                table: "Precios",
                columns: new[] { "TipoPantalla", "DuracionSegundos" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Precios");
        }
    }
}
