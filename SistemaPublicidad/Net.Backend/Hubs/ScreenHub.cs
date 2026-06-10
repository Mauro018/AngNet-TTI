using Microsoft.AspNetCore.SignalR;

public class ScreenHub : Hub
{
    private static readonly Dictionary<string, string> _connectedScreens = new();

    public override Task OnConnectedAsync()
    {
        Console.WriteLine($"Screen connected: {Context.ConnectionId}");
        return base.OnConnectedAsync();
    }

    public async Task RegisterScreen(string screenId)
    {
        _connectedScreens[Context.ConnectionId] = screenId;
        Console.WriteLine($"Screen registered: {screenId} with connection ID: {Context.ConnectionId}");
        await Clients.All.SendAsync("ScreenRegistered", screenId);
    }

    // Método que se llama desde el frontend cuando se sube el video
    public async Task SendNewVideo(string screenId, object videoData)
    {
        await Clients.Group(screenId).SendAsync("ReceiveNewVideo", videoData);
    }

    // Opcional: Enviar a todas las pantallas conectadas
    public async Task BroadcastNewVideo(object videoData)
    {
        await Clients.All.SendAsync("ReceiveNewVideo", videoData);
    }
    
}