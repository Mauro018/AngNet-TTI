namespace SistemaPublicidad.Net.Backend.Dtos
{
    public class PrecioCrearSolicitud
    {
        public string TipoPantalla { get; set; } = string.Empty;
        public int DuracionSegundos { get; set; }
        public long PrecioMensual { get; set; }
    }
}
