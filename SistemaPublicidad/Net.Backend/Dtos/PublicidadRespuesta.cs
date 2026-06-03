namespace SistemaPublicidad.Net.Backend.Dtos
{
    public class PublicidadRespuesta
    {
        public int Id { get; set; }
        public int EmpresaId { get; set; }
        public string EmpresaNombre { get; set; } = string.Empty;
        public string EmpresaNit { get; set; } = string.Empty;
        public string SectorIndustria { get; set; } = string.Empty;
        public string NombrePublicidad { get; set; } = string.Empty;
        public string TipoPantalla { get; set; } = string.Empty;
        public int DuracionVideoSegundos { get; set; }
        public int DuracionMeses { get; set; }
        public string FechaInicio { get; set; } = string.Empty;
        public string FechaFin { get; set; } = string.Empty;
        public int DiasDuracion { get; set; }
        public string Observaciones { get; set; } = string.Empty;
        public string VideoNombreArchivo { get; set; } = string.Empty;
    }
}
