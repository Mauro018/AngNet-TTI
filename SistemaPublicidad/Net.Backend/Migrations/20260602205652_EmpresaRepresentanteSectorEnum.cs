using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Net.Backend.Migrations
{
    /// <inheritdoc />
    public partial class EmpresaRepresentanteSectorEnum : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Direccion",
                table: "Empresas");

            migrationBuilder.RenameColumn(
                name: "Contacto",
                table: "Empresas",
                newName: "Representante");

            // Convertir valores de texto a enteros antes de cambiar el tipo de columna.
            migrationBuilder.Sql(@"
                ALTER TABLE ""Empresas"" ALTER COLUMN ""SectorIndustria"" DROP DEFAULT;
                ALTER TABLE ""Empresas"" ALTER COLUMN ""SectorIndustria"" TYPE integer USING (
                    CASE ""SectorIndustria""
                        WHEN 'TRANSPORTE'               THEN 0
                        WHEN 'TECNOLOGIA'               THEN 1
                        WHEN 'SALUD'                    THEN 2
                        WHEN 'GOBIERNO_E_INST_PUBLICAS' THEN 3
                        WHEN 'ALIMENTOS'                THEN 4
                        WHEN 'COMERCIO'                 THEN 5
                        WHEN 'ASEO'                     THEN 6
                        WHEN 'FINANCIERO'               THEN 7
                        ELSE 8
                    END
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Representante",
                table: "Empresas",
                newName: "Contacto");

            migrationBuilder.AlterColumn<string>(
                name: "SectorIndustria",
                table: "Empresas",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "Direccion",
                table: "Empresas",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");
        }
    }
}
