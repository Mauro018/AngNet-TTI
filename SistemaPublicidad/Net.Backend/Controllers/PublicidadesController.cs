using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaPublicidad.Net.Backend.Data;
using SistemaPublicidad.Net.Backend.Dtos;
using SistemaPublicidad.Net.Backend.Models;

[ApiController]
[Route("api/[controller]")]
public class PublicidadesController : ControllerBase
{
    private static readonly HashSet<int> DuracionesVideoPermitidas = new() { 10, 15, 20, 25, 30 };
    private static readonly HashSet<string> TiposPantallaPermitidos = new(StringComparer.OrdinalIgnoreCase)
    {
        "VerticalSamsung",
        "HorizontalDescenso",
    };
    private static readonly string[] VideoExtensionesPermitidas = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
    private static readonly long VideoTamanoMaxBytes = 200 * 1024 * 1024; // 200 MB

    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    public PublicidadesController(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    private string VideosPath => Path.Combine(_env.ContentRootPath, "Videos");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PublicidadRespuesta>>> GetPublicidades()
    {
        var publicidades = await _context.Publicidades
            .AsNoTracking()
            .Include(publicidad => publicidad.Empresa)
            .OrderByDescending(publicidad => publicidad.FechaCreacion)
            .Select(publicidad => MapToResponse(publicidad))
            .ToListAsync();

        return publicidades;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PublicidadRespuesta>> GetPublicidad(int id)
    {
        var publicidad = await _context.Publicidades
            .AsNoTracking()
            .Include(current => current.Empresa)
            .Where(current => current.Id == id)
            .Select(current => MapToResponse(current))
            .FirstOrDefaultAsync();

        if (publicidad == null)
        {
            return NotFound();
        }

        return publicidad;
    }

    // GET: api/publicidades/{id}/video  — ver en el navegador (inline)
    [HttpGet("{id}/video")]
    public async Task<IActionResult> VerVideo(int id)
    {
        var publicidad = await _context.Publicidades.FindAsync(id);
        if (publicidad == null || string.IsNullOrEmpty(publicidad.VideoNombreArchivo))
            return NotFound(new { mensaje = "Esta publicidad no tiene video asociado." });

        var path = Path.Combine(VideosPath, publicidad.VideoNombreArchivo);
        if (!System.IO.File.Exists(path))
            return NotFound(new { mensaje = "El archivo de video no se encontró en el servidor." });

        var ext = Path.GetExtension(publicidad.VideoNombreArchivo).ToLowerInvariant();
        var contentType = ext switch
        {
            ".mp4"  => "video/mp4",
            ".mov"  => "video/quicktime",
            ".avi"  => "video/x-msvideo",
            ".mkv"  => "video/x-matroska",
            ".webm" => "video/webm",
            _       => "application/octet-stream",
        };

        var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        return File(stream, contentType, enableRangeProcessing: true);
    }

    // GET: api/publicidades/{id}/descarga  — fuerza descarga
    [HttpGet("{id}/descarga")]
    public async Task<IActionResult> DescargarVideo(int id)
    {
        var publicidad = await _context.Publicidades.FindAsync(id);
        if (publicidad == null || string.IsNullOrEmpty(publicidad.VideoNombreArchivo))
            return NotFound(new { mensaje = "Esta publicidad no tiene video asociado." });

        var path = Path.Combine(VideosPath, publicidad.VideoNombreArchivo);
        if (!System.IO.File.Exists(path))
            return NotFound(new { mensaje = "El archivo de video no se encontró en el servidor." });

        var ext = Path.GetExtension(publicidad.VideoNombreArchivo).ToLowerInvariant();
        var contentType = ext switch
        {
            ".mp4"  => "video/mp4",
            ".mov"  => "video/quicktime",
            ".avi"  => "video/x-msvideo",
            ".mkv"  => "video/x-matroska",
            ".webm" => "video/webm",
            _       => "application/octet-stream",
        };

        var nombreDescarga = $"{publicidad.NombrePublicidad}{ext}";
        var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        return File(stream, contentType, nombreDescarga);
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<PublicidadRespuesta>> PostPublicidad(
        [FromForm] PublicidadCrearSolicitud request,
        IFormFile? video)
    {
        if (video == null)
            return BadRequest(new { mensaje = "El video es obligatorio para registrar una publicidad." });

        var ext = Path.GetExtension(video.FileName).ToLowerInvariant();
        if (!VideoExtensionesPermitidas.Contains(ext))
            return BadRequest(new { mensaje = "Formato de video no permitido. Usa mp4, mov, avi, mkv o webm." });

        if (video.Length > VideoTamanoMaxBytes)
            return BadRequest(new { mensaje = "El video supera el tamaño máximo permitido (200 MB)." });

        var empresa = await _context.Empresas.FindAsync(request.EmpresaId);

        if (empresa == null)
            return BadRequest(new { mensaje = "La empresa seleccionada no existe." });

        if (!empresa.Activo)
            return Conflict(new { mensaje = "No se puede registrar una publicidad para una empresa inactiva." });

        var nombreNormalizado = request.NombrePublicidad.Trim().ToUpper();
        var existeNombre = await _context.Publicidades.AnyAsync(p => p.NombrePublicidad == nombreNormalizado);
        if (existeNombre)
            return Conflict(new { mensaje = "Ya existe una publicidad registrada con ese nombre." });

        if (request.FechaFin < request.FechaInicio)
            return BadRequest(new { mensaje = "La fecha de fin no puede ser anterior a la fecha de inicio." });

        if (!DuracionesVideoPermitidas.Contains(request.DuracionVideoSegundos))
            return BadRequest(new { mensaje = "La duración del video debe ser 10, 15, 20, 25 o 30 segundos." });

        if (!TiposPantallaPermitidos.Contains(request.TipoPantalla))
            return BadRequest(new { mensaje = "La pantalla seleccionada no es válida." });

        if (request.DuracionMeses < 1 || request.DuracionMeses > 12)
            return BadRequest(new { mensaje = "La cantidad de tiempo debe estar entre 1 y 12 meses." });

        // Guardar video en disco
        Directory.CreateDirectory(VideosPath);
        var nombreArchivo = $"{Guid.NewGuid()}{ext}";
        var rutaArchivo = Path.Combine(VideosPath, nombreArchivo);
        await using (var fs = new FileStream(rutaArchivo, FileMode.Create))
        {
            await video.CopyToAsync(fs);
        }

        var fechaInicio = request.FechaInicio.Date;
        var fechaFinCalculada = fechaInicio.AddMonths(request.DuracionMeses).AddDays(-1);

        var publicidad = new Publicidad
        {
            EmpresaId = request.EmpresaId,
            NombrePublicidad = nombreNormalizado,
            TipoPantalla = request.TipoPantalla,
            DuracionVideoSegundos = request.DuracionVideoSegundos,
            DuracionMeses = request.DuracionMeses,
            FechaInicio = fechaInicio,
            FechaFin = fechaFinCalculada,
            Descripcion = request.Observaciones.Trim(),
            VideoNombreArchivo = nombreArchivo,
            FechaCreacion = DateTime.UtcNow,
        };

        _context.Publicidades.Add(publicidad);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Eliminar el video si la inserción falló
            if (System.IO.File.Exists(rutaArchivo))
                System.IO.File.Delete(rutaArchivo);
            return Conflict(new { mensaje = "No fue posible registrar la publicidad porque el nombre ya existe." });
        }

        publicidad.Empresa = empresa;
        return CreatedAtAction(nameof(GetPublicidad), new { id = publicidad.Id }, MapToResponse(publicidad));
    }

    // PUT: api/publicidades/{id}  — edita cantidad de tiempo, fecha inicio y observaciones
    [HttpPut("{id}")]
    public async Task<ActionResult<PublicidadRespuesta>> PutPublicidad(int id, [FromBody] PublicidadEditarSolicitud datos)
    {
        var publicidad = await _context.Publicidades
            .Include(p => p.Empresa)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (publicidad == null) return NotFound();

        if (datos.DuracionMeses < 1 || datos.DuracionMeses > 12)
            return BadRequest(new { mensaje = "La cantidad de tiempo debe estar entre 1 y 12 meses." });

        var fechaInicio = datos.FechaInicio.Date;
        var fechaFin = fechaInicio.AddMonths(datos.DuracionMeses).AddDays(-1);

        publicidad.DuracionMeses = datos.DuracionMeses;
        publicidad.FechaInicio = fechaInicio;
        publicidad.FechaFin = fechaFin;
        publicidad.Descripcion = datos.Observaciones.Trim();

        try { await _context.SaveChangesAsync(); }
        catch (DbUpdateException) { return Conflict(new { mensaje = "No fue posible actualizar la publicidad." }); }

        return MapToResponse(publicidad);
    }

    // PATCH: api/publicidades/{id}/video  — reemplaza el video de una publicidad existente
    [HttpPatch("{id}/video")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<PublicidadRespuesta>> PatchVideo(int id, IFormFile video)
    {
        if (video == null)
            return BadRequest(new { mensaje = "Debes adjuntar un archivo de video." });

        var ext = Path.GetExtension(video.FileName).ToLowerInvariant();
        if (!VideoExtensionesPermitidas.Contains(ext))
            return BadRequest(new { mensaje = "Formato de video no permitido. Usa mp4, mov, avi, mkv o webm." });

        if (video.Length > VideoTamanoMaxBytes)
            return BadRequest(new { mensaje = "El video supera el tamaño máximo permitido (200 MB)." });

        var publicidad = await _context.Publicidades
            .Include(p => p.Empresa)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (publicidad == null) return NotFound();

        // Eliminar video anterior si existe
        if (!string.IsNullOrEmpty(publicidad.VideoNombreArchivo))
        {
            var anterior = Path.Combine(VideosPath, publicidad.VideoNombreArchivo);
            if (System.IO.File.Exists(anterior)) System.IO.File.Delete(anterior);
        }

        Directory.CreateDirectory(VideosPath);
        var nombreArchivo = $"{Guid.NewGuid()}{ext}";
        var rutaArchivo = Path.Combine(VideosPath, nombreArchivo);
        await using (var fs = new FileStream(rutaArchivo, FileMode.Create))
        {
            await video.CopyToAsync(fs);
        }

        publicidad.VideoNombreArchivo = nombreArchivo;
        await _context.SaveChangesAsync();

        return MapToResponse(publicidad);
    }

    private static PublicidadRespuesta MapToResponse(Publicidad publicidad)
    {
        return new PublicidadRespuesta
        {
            Id = publicidad.Id,
            EmpresaId = publicidad.EmpresaId,
            EmpresaNombre = publicidad.Empresa?.Nombre ?? string.Empty,
            EmpresaNit = publicidad.Empresa?.Nit ?? string.Empty,
            SectorIndustria = publicidad.Empresa?.SectorIndustria.ToString() ?? string.Empty,
            NombrePublicidad = publicidad.NombrePublicidad,
            TipoPantalla = publicidad.TipoPantalla,
            DuracionVideoSegundos = publicidad.DuracionVideoSegundos,
            DuracionMeses = publicidad.DuracionMeses,
            FechaInicio = publicidad.FechaInicio.ToString("yyyy-MM-dd"),
            FechaFin = publicidad.FechaFin.ToString("yyyy-MM-dd"),
            DiasDuracion = Math.Max(1, (int)Math.Ceiling((publicidad.FechaFin.Date - publicidad.FechaInicio.Date).TotalDays) + 1),
            Observaciones = publicidad.Descripcion,
            VideoNombreArchivo = publicidad.VideoNombreArchivo,
        };
    }
}
