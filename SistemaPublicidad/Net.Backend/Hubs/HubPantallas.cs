using Microsoft.AspNetCore.SignalR;

namespace SistemaPublicidad.Net.Backend.Hubs
{
    /// <summary>
    /// Hub de SignalR encargado de coordinar la reproducción de publicidades
    /// en las pantallas y las vistas previas del panel administrativo.
    ///
    /// Las pantallas (TV, portátiles, etc.) se registran indicando su tipo
    /// de pantalla (Vertical / Horizontal) y se unen a un grupo con ese
    /// identificador. Dentro de cada grupo se elige un líder entre las
    /// pantallas que están reproduciendo activamente; su estado de reproducción
    /// se retransmite al resto para mantener todas las pantallas del mismo tipo
    /// sincronizadas (mismo video y posición).
    /// </summary>
    public class HubPantallas : Hub
    {
        // connectionId -> identificador de pantalla (tipo de pantalla + nombre opcional)
        private static readonly Dictionary<string, string> _pantallasConectadas = new();

        // connectionId -> tipo de pantalla que está reproduciendo activamente
        private static readonly Dictionary<string, string> _pantallasReproduciendo = new();

        // tipoPantalla -> connectionId del líder actual
        private static readonly Dictionary<string, string> _lideresPorTipo = new();

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"[HubPantallas] Conectado: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var connectionId = Context.ConnectionId;
            if (_pantallasConectadas.TryGetValue(connectionId, out var pantallaId))
            {
                _pantallasConectadas.Remove(connectionId);
                _pantallasReproduciendo.Remove(connectionId);
                Console.WriteLine($"[HubPantallas] Desconectado: {pantallaId} ({connectionId})");

                var tipoPantalla = pantallaId.Contains("::") ? pantallaId.Split("::")[0] : pantallaId;
                await RelevarLider(tipoPantalla);
            }
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Registra la pantalla actual y la une al grupo correspondiente a su tipo.
        /// <paramref name="tipoPantalla"/> debe ser "Vertical" o "Horizontal".
        /// <paramref name="identificador"/> es un nombre libre (ej. "PantallaRecepcion1").
        /// </summary>
        public async Task RegistrarPantalla(string tipoPantalla, string identificador)
        {
            if (string.IsNullOrWhiteSpace(tipoPantalla))
            {
                throw new HubException("El tipo de pantalla es obligatorio.");
            }

            var idCompleto = $"{tipoPantalla}::{identificador}";
            _pantallasConectadas[Context.ConnectionId] = idCompleto;

            await Groups.AddToGroupAsync(Context.ConnectionId, tipoPantalla);

            Console.WriteLine($"[HubPantallas] Pantalla registrada: {idCompleto} ({Context.ConnectionId})");

            await Clients.Caller.SendAsync("PantallaRegistrada", new
            {
                connectionId = Context.ConnectionId,
                tipoPantalla,
                identificador
            });

            await Clients.Group(tipoPantalla).SendAsync("PantallaConectada", idCompleto);

            // Si ya existe un líder reproduciendo para este tipo, le pedimos su
            // estado para que el nuevo seguidor se alinee inmediatamente.
            if (_lideresPorTipo.TryGetValue(tipoPantalla, out var liderId) && !string.IsNullOrEmpty(liderId))
            {
                if (liderId == Context.ConnectionId)
                {
                    await Clients.Caller.SendAsync("EresLider", tipoPantalla);
                }
                else
                {
                    await Clients.Client(liderId).SendAsync("SolicitarEstado", tipoPantalla);
                }
            }
        }

        /// <summary>
        /// Marca a la pantalla actual como reproduciendo. Si no hay un líder
        /// activo para este tipo, esta pantalla se convierte en el líder y las
        /// demás deberán seguir su estado. Si ya hay un líder, la pantalla se
        /// une como seguidora y solicita el estado actual para sincronizarse.
        /// </summary>
        public async Task IniciarReproduccion(string tipoPantalla)
        {
            if (string.IsNullOrWhiteSpace(tipoPantalla)) return;

            _pantallasReproduciendo[Context.ConnectionId] = tipoPantalla;
            Console.WriteLine($"[HubPantallas] Pantalla {Context.ConnectionId} inició reproducción en {tipoPantalla}");

            if (!_lideresPorTipo.TryGetValue(tipoPantalla, out var liderId) || string.IsNullOrEmpty(liderId))
            {
                await DesignarLider(tipoPantalla, Context.ConnectionId);
            }
            else if (liderId == Context.ConnectionId)
            {
                await Clients.Caller.SendAsync("EresLider", tipoPantalla);
            }
            else
            {
                // Hay un líder activo: nos alineamos pidiendo su estado.
                await Clients.Client(liderId).SendAsync("SolicitarEstado", tipoPantalla);
            }
        }

        /// <summary>
        /// Marca a la pantalla actual como detenida. Si era el líder, se elige
        /// un nuevo líder entre las pantallas que aún estén reproduciendo.
        /// </summary>
        public async Task DetenerReproduccion(string tipoPantalla)
        {
            if (string.IsNullOrWhiteSpace(tipoPantalla)) return;

            _pantallasReproduciendo.Remove(Context.ConnectionId);
            Console.WriteLine($"[HubPantallas] Pantalla {Context.ConnectionId} detuvo reproducción en {tipoPantalla}");

            if (_lideresPorTipo.TryGetValue(tipoPantalla, out var liderId) && liderId == Context.ConnectionId)
            {
                _lideresPorTipo.Remove(tipoPantalla);
                await ElegirNuevoLiderReproduciendo(tipoPantalla);
            }
        }

        /// <summary>
        /// Reporte periódico del líder con el video actual y la posición de reproducción.
        /// El hub retransmite el estado al resto de pantallas del mismo tipo.
        /// </summary>
        public async Task ReportarEstadoReproduccion(string tipoPantalla, int publicidadId, double tiempoSegundos)
        {
            if (string.IsNullOrWhiteSpace(tipoPantalla)) return;

            // Solo el líder tiene autoridad para retransmitir el estado.
            if (_lideresPorTipo.TryGetValue(tipoPantalla, out var liderId) && liderId != Context.ConnectionId)
            {
                return;
            }

            var estado = new
            {
                tipoPantalla,
                publicidadId,
                tiempoSegundos,
                timestampUtc = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            await Clients.Group(tipoPantalla).SendAsync("EstadoReproduccion", estado);
        }

        /// <summary>
        /// Solicita al líder del tipo que envíe su estado actual. Útil para
        /// pantallas que se unen tarde a una reproducción ya en curso.
        /// </summary>
        public async Task SolicitarEstadoActual(string tipoPantalla)
        {
            if (string.IsNullOrWhiteSpace(tipoPantalla)) return;

            if (_lideresPorTipo.TryGetValue(tipoPantalla, out var liderId) && !string.IsNullOrEmpty(liderId))
            {
                await Clients.Client(liderId).SendAsync("SolicitarEstado", tipoPantalla);
            }
        }

        /// <summary>
        /// Notifica a todas las pantallas de un tipo que se dio de alta una nueva publicidad.
        /// </summary>
        public async Task NotificarNuevaPublicidad(string tipoPantalla, object datosPublicidad)
        {
            if (string.IsNullOrWhiteSpace(tipoPantalla)) return;
            await Clients.Group(tipoPantalla).SendAsync("PublicidadNueva", datosPublicidad);
        }

        /// <summary>
        /// Notifica a todas las pantallas de un tipo que una publicidad fue removida
        /// (por ejemplo, porque venció).
        /// </summary>
        public async Task NotificarPublicidadRemovida(string tipoPantalla, int publicidadId)
        {
            if (string.IsNullOrWhiteSpace(tipoPantalla)) return;
            await Clients.Group(tipoPantalla).SendAsync("PublicidadRemovida", new
            {
                tipoPantalla,
                publicidadId
            });
        }

        /// <summary>
        /// Emite a todas las pantallas y vistas previas que refresquen su lista de
        /// publicidades vigentes. Se usa cuando algo cambia en la base de datos.
        /// </summary>
        public async Task RefrescarVigentes(string tipoPantalla)
        {
            if (string.IsNullOrWhiteSpace(tipoPantalla)) return;
            await Clients.Group(tipoPantalla).SendAsync("RefrescarVigentes", tipoPantalla);
        }

        private async Task RelevarLider(string tipoPantalla)
        {
            if (_lideresPorTipo.TryGetValue(tipoPantalla, out var liderId) && liderId == Context.ConnectionId)
            {
                _lideresPorTipo.Remove(tipoPantalla);
                Console.WriteLine($"[HubPantallas] Líder desconectado en {tipoPantalla}, se reasignará.");
                await ElegirNuevoLiderReproduciendo(tipoPantalla);
            }
        }

        private async Task ElegirNuevoLiderReproduciendo(string tipoPantalla)
        {
            // Preferir pantallas que están reproduciendo activamente.
            var candidato = _pantallasReproduciendo
                .Where(kv => kv.Value.Equals(tipoPantalla, StringComparison.OrdinalIgnoreCase))
                .Select(kv => kv.Key)
                .FirstOrDefault();

            if (string.IsNullOrEmpty(candidato))
            {
                // Si nadie está reproduciendo, no hay líder hasta que alguien inicie.
                Console.WriteLine($"[HubPantallas] No hay líder activo en {tipoPantalla} (nadie reproduciendo).");
                return;
            }

            await DesignarLider(tipoPantalla, candidato);
        }

        private async Task DesignarLider(string tipoPantalla, string connectionId)
        {
            _lideresPorTipo[tipoPantalla] = connectionId;
            Console.WriteLine($"[HubPantallas] Nuevo líder en {tipoPantalla}: {connectionId}");
            await Clients.Client(connectionId).SendAsync("EresLider", tipoPantalla);
            // El nuevo líder debe emitir su estado para que los seguidores se alineen.
            await Clients.Client(connectionId).SendAsync("SolicitarEstado", tipoPantalla);
        }
    }
}
