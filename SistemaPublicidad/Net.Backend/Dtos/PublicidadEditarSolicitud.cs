namespace SistemaPublicidad.Net.Backend.Dtos
{
    // Campos editables de una publicidad: tiempo, fecha de inicio y observaciones.
    // El video se actualiza mediante un endpoint separado (PATCH /api/publicidades/{id}/video).
    public class PublicidadEditarSolicitud
    {
        public int DuracionMeses { get; set; }
        public DateTime FechaInicio { get; set; }
        public string Observaciones { get; set; } = string.Empty;
    }
}
