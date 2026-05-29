namespace SistemaPublicidad.Net.Backend.Dtos
{
    public class PrecioCreateRequest
    {
        public string TipoPantalla { get; set; } = string.Empty;
        public int DuracionSegundos { get; set; }
        public long PrecioMensual { get; set; }
    }
}
