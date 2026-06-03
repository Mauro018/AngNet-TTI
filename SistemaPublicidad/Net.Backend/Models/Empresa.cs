using System.ComponentModel.DataAnnotations;

namespace SistemaPublicidad.Net.Backend.Models
{
    public enum SectorIndustria
    {
        TRANSPORTE,
        TECNOLOGIA,
        SALUD,
        GOBIERNO_E_INST_PUBLICAS,
        ALIMENTOS,
        COMERCIO,
        ASEO,
        FINANCIERO,
        OTROS
    }

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
        public string Representante { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Cedula { get; set; } = string.Empty;

        [Required]
        public SectorIndustria SectorIndustria { get; set; } = SectorIndustria.OTROS;

        [Required]
        [StringLength(20)]
        public string Telefono { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        //Relación con las publicidades
        public ICollection<Publicidad> Publicidades { get; set; } = new List<Publicidad>();
    }
}