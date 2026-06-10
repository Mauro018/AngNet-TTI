using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using SistemaPublicidad.Net.Backend.Data;                     //Esto cambia de acuerdo al namespace que se este usando
using SistemaPublicidad.Net.Backend.Hubs;
using SistemaPublicidad.Net.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

// ============= SERVICIOS =============

// Configuración de PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// CORS - Permite las solicitudes para que Angular se pueda comunicar con el backend
// y para que SignalR pueda negociar y transferir mensajes entre clientes.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Devolver un JSON uniforme { mensaje, errores } en vez del ProblemDetails por defecto
        options.InvalidModelStateResponseFactory = context =>
        {
            var errores = context.ModelState
                .Where(kv => kv.Value?.Errors.Count > 0)
                .ToDictionary(
                    kv => kv.Key,
                    kv => kv.Value!.Errors.Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage)
                        ? (e.Exception?.Message ?? "Valor inválido")
                        : e.ErrorMessage).ToArray()
                );

            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new
            {
                mensaje = "Los datos enviados no son válidos.",
                errores
            });
        };
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Permitir subida de videos de hasta 200 MB
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 200 * 1024 * 1024;
});
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 200 * 1024 * 1024;
});
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Sistema Publicidad API",
        Version = "v1"
    });
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 250 * 1024 * 1024; // 250 MB
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 250 * 1024 * 1024; // 250 MB
});

// Configurar JSON para que los mensajes de SignalR usen camelCase y
// coincidan con los nombres que el cliente @microsoft/signalr espera.
// (No existe HubOptions.SerializerOptions en .NET 9; en su lugar usamos
//  AddJsonProtocol sobre el servicio de SignalR.)
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
})
.AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions = new System.Text.Json.JsonSerializerOptions
    {
        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };
});

// Servicio en segundo plano que detecta cuando una publicidad vence y
// notifica a las pantallas y a la vista previa para que la retiren.
builder.Services.AddHostedService<ServicioVencimientoPublicidades>();

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// ============= CONFIGURACIÓN DEL PIPELINE =============

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();
}

// Usar CORS antes de los endpoints
app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();

app.MapHub<HubPantallas>("/hubpantallas");

app.UseStaticFiles();
app.UseRouting();

app.Run();