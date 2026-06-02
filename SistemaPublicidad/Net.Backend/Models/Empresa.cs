using System.ComponentModel.DataAnnotations;

namespace SistemaPublicidad.Net.Backend.Models
{
    public class Empresa
    {
        public int Id { get; set; }

        [Required]
        [StringLength(200)]
        public string Nombre { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Nit { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Contacto { get; set; } = string.Empty;

        [StringLength(100)]
        public string SectorIndustria { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Telefono { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(300)]
        public string Direccion { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        //Relación con las publicidades
        public ICollection<Publicidad> Publicidades { get; set; } = new List<Publicidad>();
    }
}