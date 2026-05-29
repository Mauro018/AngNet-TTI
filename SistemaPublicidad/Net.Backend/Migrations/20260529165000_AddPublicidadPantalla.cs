using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Net.Backend.Migrations
{
    public partial class AddPublicidadPantalla : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Publicidades"
                ADD COLUMN IF NOT EXISTS "DuracionVideoSegundos" integer NOT NULL DEFAULT 10;
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Publicidades"
                ADD COLUMN IF NOT EXISTS "DuracionMeses" integer NOT NULL DEFAULT 1;
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Publicidades"
                ADD COLUMN IF NOT EXISTS "TipoPantalla" character varying(50) NOT NULL DEFAULT 'VerticalSamsung';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Publicidades" DROP COLUMN IF EXISTS "TipoPantalla";
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Publicidades" DROP COLUMN IF EXISTS "DuracionMeses";
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Publicidades" DROP COLUMN IF EXISTS "DuracionVideoSegundos";
                """);
        }
    }
}