namespace SistemaPublicidad.Net.Backend.Dtos
{
    /// <summary>
    /// Versión pública de una publicidad vigente pensada para el player
    /// y la vista previa. Solo expone la información necesaria para
    /// reproducir el video en un dispositivo externo.
    /// </summary>
    public class PublicidadVigenteRespuesta
    {
        public int Id { get; set; }
        public int EmpresaId { get; set; }
        public string EmpresaNombre { get; set; } = string.Empty;
        public string NombrePublicidad { get; set; } = string.Empty;
        public string TipoPantalla { get; set; } = string.Empty;
        public int DuracionVideoSegundos { get; set; }
        public string FechaInicio { get; set; } = string.Empty;
        public string FechaFin { get; set; } = string.Empty;
        /// <summary>URL absoluta del endpoint que sirve el archivo de video.</summary>
        public string UrlVideo { get; set; } = string.Empty;
    }
}
