namespace SistemaPublicidad.Net.Backend.Dtos
{
    public class PrecioResponse
    {
        public int Id { get; set; }
        public string TipoPantalla { get; set; } = string.Empty;
        public int DuracionSegundos { get; set; }
        public long PrecioMensual { get; set; }
        public DateTime FechaCreacion { get; set; }
    }
}
