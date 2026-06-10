using Microsoft.AspNetCore.SignalR;

namespace SistemaPublicidad.Net.Backend.Hubs
{
    /// <summary>
    /// Hub de SignalR encargado de coordinar la reproducción de publicidades
    /// en las pantallas y las vistas previas del panel administrativo.
    ///
    /// Las pantallas (TV, portátiles, etc.) se registran indicando su tipo
    /// de pantalla (VerticalSamsung / HorizontalDescenso) y se unen a un
    /// grupo con ese identificador para recibir únicamente las publicidades
    /// que les corresponden.
    /// </summary>
    public class HubPantallas : Hub
    {
        // connectionId -> identificador de pantalla (tipo de pantalla + nombre opcional)
        private static readonly Dictionary<string, string> _pantallasConectadas = new();

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"[HubPantallas] Conectado: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (_pantallasConectadas.TryGetValue(Context.ConnectionId, out var pantallaId))
            {
                _pantallasConectadas.Remove(Context.ConnectionId);
                Console.WriteLine($"[HubPantallas] Desconectado: {pantallaId} ({Context.ConnectionId})");
            }
            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Registra la pantalla actual y la une al grupo correspondiente a su tipo.
        /// <paramref name="tipoPantalla"/> debe ser "VerticalSamsung" o "HorizontalDescenso".
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
    }
}
