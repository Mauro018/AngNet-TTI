using Microsoft.AspNetCore.SignalR;
using SistemaPublicidad.Net.Backend.Dtos;
using SistemaPublicidad.Net.Backend.Hubs;

namespace SistemaPublicidad.Net.Backend.Services
{
    /// <summary>
    /// Servicio en segundo plano que recorre periódicamente las publicidades
    /// vigentes y notifica al HubPantallas cuando alguna vence, de modo que
    /// los reproductores y vistas previas la retiren del bucle en vivo.
    /// </summary>
    public class ServicioVencimientoPublicidades : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<HubPantallas> _hubContext;
        private readonly ILogger<ServicioVencimientoPublicidades> _logger;
        private readonly TimeSpan _intervalo = TimeSpan.FromMinutes(1);

        public ServicioVencimientoPublicidades(
            IServiceScopeFactory scopeFactory,
            IHubContext<HubPantallas> hubContext,
            ILogger<ServicioVencimientoPublicidades> logger)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Conjunto de publicidades previamente conocidas como vigentes
            // (por tipo de pantalla). Se usa para detectar altas y bajas.
            var conocidasPorTipo = new Dictionary<string, HashSet<int>>(StringComparer.OrdinalIgnoreCase);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<Data.ApplicationDbContext>();

                    // Comparamos por fecha (sin hora) para mantener consistencia
                    // con ObtenerVigentes del PublicidadesController.
                    var hoy = DateTime.Today;

                    var publicidades = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
                        .ToListAsync(db.Publicidades
                            .Where(p => p.FechaInicio.Date <= hoy
                                        && p.FechaFin.Date >= hoy
                                        && p.VideoNombreArchivo != null
                                        && p.VideoNombreArchivo != string.Empty),
                            stoppingToken);

                    var actualesPorTipo = new Dictionary<string, HashSet<int>>(StringComparer.OrdinalIgnoreCase);

                    foreach (var pub in publicidades)
                    {
                        if (!actualesPorTipo.TryGetValue(pub.TipoPantalla, out var set))
                        {
                            set = new HashSet<int>();
                            actualesPorTipo[pub.TipoPantalla] = set;
                        }
                        set.Add(pub.Id);
                    }

                    // Detectar publicidades que se dieron de baja (vencieron o se eliminaron)
                    foreach (var (tipo, anteriores) in conocidasPorTipo)
                    {
                        HashSet<int> actuales = actualesPorTipo.TryGetValue(tipo, out var s) ? s : new HashSet<int>();
                        var vencidas = anteriores.Except(actuales).ToList();
                        foreach (var id in vencidas)
                        {
                            _logger.LogInformation("Publicidad {Id} ({Tipo}) vencida → notificando a las pantallas.", id, tipo);
                            await _hubContext.Clients.Group(tipo).SendAsync("PublicidadRemovida", new
                            {
                                tipoPantalla = tipo,
                                publicidadId = id
                            });
                        }
                    }

                    // Detectar publicidades nuevas (para que el player refresque)
                    foreach (var (tipo, actuales) in actualesPorTipo)
                    {
                        HashSet<int> anteriores = conocidasPorTipo.TryGetValue(tipo, out var s) ? s : new HashSet<int>();
                        var nuevas = actuales.Except(anteriores).ToList();
                        if (nuevas.Count > 0)
                        {
                            _logger.LogInformation("Nuevas publicidades en {Tipo}: {Ids}", tipo, string.Join(",", nuevas));
                            await _hubContext.Clients.Group(tipo).SendAsync("RefrescarVigentes", tipo);
                        }
                    }

                    conocidasPorTipo = actualesPorTipo;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error revisando vencimientos de publicidades.");
                }

                try
                {
                    await Task.Delay(_intervalo, stoppingToken);
                }
                catch (TaskCanceledException) { /* fin */ }
            }
        }
    }
}
