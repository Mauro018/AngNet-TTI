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
    private static readonly HashSet<int> hashSet = new() { 10, 15, 20, 25, 30 };
    //private static readonly HashSet<int> DuracionesVideoPermitidas = hashSet;
    private readonly ApplicationDbContext _context;

    public PublicidadesController(ApplicationDbContext context)
    {
        _context = context;
    }

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

    [HttpPost]
    public async Task<ActionResult<PublicidadRespuesta>> PostPublicidad([FromBody] PublicidadCrearSolicitud request)
    {
        var empresa = await _context.Empresas.FindAsync(request.EmpresaId);

        if (empresa == null)
        {
            return BadRequest("La empresa seleccionada no existe.");
        }

        if (!empresa.Activo)
        {
            return Conflict(new { mensaje = "No se puede registrar una publicidad para una empresa inactiva." });
        }

        var nombreNormalizado = request.NombrePublicidad.Trim().ToUpper();
        var existeNombre = await _context.Publicidades.AnyAsync(p => p.NombrePublicidad == nombreNormalizado);
        if (existeNombre)
        {
            return Conflict(new { mensaje = "Ya existe una publicidad registrada con ese nombre." });
        }

        if (request.FechaFin < request.FechaInicio)
        {
            return BadRequest("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }

        if (!DuracionesVideoPermitidas.Contains(request.DuracionVideoSegundos))
        {
            return BadRequest("La duración del video debe ser 10, 15, 20, 25 o 30 segundos.");
        }

        if (!TiposPantallaPermitidos.Contains(request.TipoPantalla))
        {
            return BadRequest("La pantalla seleccionada no es válida.");
        }

        if (request.DuracionMeses < 1 || request.DuracionMeses > 12)
        {
            return BadRequest("La cantidad de tiempo debe estar entre 1 y 12 meses.");
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
            FechaCreacion = DateTime.UtcNow,
        };

        _context.Publicidades.Add(publicidad);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { mensaje = "No fue posible registrar la publicidad porque el nombre ya existe." });
        }

        publicidad.Empresa = empresa;

        var response = MapToResponse(publicidad);

        return CreatedAtAction(nameof(GetPublicidad), new { id = publicidad.Id }, response);
    }

    private static PublicidadRespuesta MapToResponse(Publicidad publicidad)
    {
        return new PublicidadRespuesta
        {
            Id = publicidad.Id,
            EmpresaId = publicidad.EmpresaId,
            EmpresaNombre = publicidad.Empresa?.Nombre ?? string.Empty,
            EmpresaNit = publicidad.Empresa?.Nit ?? string.Empty,
            SectorIndustria = publicidad.Empresa?.SectorIndustria ?? string.Empty,
            NombrePublicidad = publicidad.NombrePublicidad,
            TipoPantalla = publicidad.TipoPantalla,
            DuracionVideoSegundos = publicidad.DuracionVideoSegundos,
            DuracionMeses = publicidad.DuracionMeses,
            FechaInicio = publicidad.FechaInicio.ToString("yyyy-MM-dd"),
            FechaFin = publicidad.FechaFin.ToString("yyyy-MM-dd"),
            DiasDuracion = Math.Max(1, (int)Math.Ceiling((publicidad.FechaFin.Date - publicidad.FechaInicio.Date).TotalDays) + 1),
            Observaciones = publicidad.Descripcion,
        };
    }
}