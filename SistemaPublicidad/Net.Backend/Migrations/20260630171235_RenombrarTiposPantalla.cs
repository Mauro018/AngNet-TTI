using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Net.Backend.Migrations
{
    /// <inheritdoc />
    public partial class RenombrarTiposPantalla : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Publicidades"
                SET "TipoPantalla" = 'Vertical'
                WHERE "TipoPantalla" = 'VerticalSamsung';
                """);

            migrationBuilder.Sql("""
                UPDATE "Publicidades"
                SET "TipoPantalla" = 'Horizontal'
                WHERE "TipoPantalla" = 'HorizontalDescenso';
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Publicidades"
                ALTER COLUMN "TipoPantalla" SET DEFAULT 'Vertical';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Publicidades"
                SET "TipoPantalla" = 'VerticalSamsung'
                WHERE "TipoPantalla" = 'Vertical';
                """);

            migrationBuilder.Sql("""
                UPDATE "Publicidades"
                SET "TipoPantalla" = 'HorizontalDescenso'
                WHERE "TipoPantalla" = 'Horizontal';
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Publicidades"
                ALTER COLUMN "TipoPantalla" SET DEFAULT 'VerticalSamsung';
                """);
        }
    }
}
