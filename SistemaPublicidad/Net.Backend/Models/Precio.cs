using System.ComponentModel.DataAnnotations;

namespace SistemaPublicidad.Net.Backend.Models
{
    public class Precio
    {
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string TipoPantalla { get; set; } = string.Empty;

        [Range(10, 30)]
        public int DuracionSegundos { get; set; }

        public long PrecioMensual { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
    }
}
