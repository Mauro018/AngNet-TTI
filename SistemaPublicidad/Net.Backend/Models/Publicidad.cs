using System.ComponentModel.DataAnnotations;

namespace SistemaPublicidad.Net.Backend.Models
{
    public class Publicidad
    {
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string NombrePublicidad { get; set; } = string.Empty;

        [Required]
        public DateTime FechaInicio { get; set; }

        [Required]
        public DateTime FechaFin { get; set; }

        [Range(10, 30)]
        public int DuracionVideoSegundos { get; set; } = 10;

        [Range(1, 12)]
        public int DuracionMeses { get; set; } = 1;

        [Required]
        [StringLength(50)]
        public string TipoPantalla { get; set; } = "VerticalSamsung";

        [StringLength(300)]
        public string Descripcion { get; set; } = string.Empty;

        // Nombre del archivo de video almacenado en el servidor (ej. "abc123.mp4").
        [StringLength(260)]
        public string VideoNombreArchivo { get; set; } = string.Empty;

        //Clave foránea
        public int EmpresaId { get; set; }
        public Empresa Empresa { get; set; } = null!;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    }
}