namespace SistemaPublicidad.Net.Backend.Dtos
{
    public class PublicidadCreateRequest
    {
        public int EmpresaId { get; set; }
        public string NombrePublicidad { get; set; } = string.Empty;
        public string TipoPantalla { get; set; } = string.Empty;
        public int DuracionVideoSegundos { get; set; }
        public int DuracionMeses { get; set; }
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public string Observaciones { get; set; } = string.Empty;
    }
}