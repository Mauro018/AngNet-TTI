using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaPublicidad.Net.Backend.Data;
using SistemaPublicidad.Net.Backend.Models;

[ApiController]
[Route("api/[controller]")]
public class EmpresasController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EmpresasController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/Empresas
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Empresa>>> GetEmpresas()
    {
        // Desactivar automáticamente las empresas activas cuyas publicidades
        // hayan vencido en su totalidad (todas sus publicidades con FechaFin < hoy).
        // Se compara contra la fecha actual en zona horaria local (Colombia, UTC-5)
        // para que el corte del día coincida con el calendario del usuario.
        var hoy = DateTime.UtcNow.Date;
        var hace30Dias = hoy.AddDays(-30);

        var empresas = await _context.Empresas
            .OrderBy(e => e.Id)
            .ToListAsync();

        if (empresas.Count > 0)
        {
            // Traemos solo los datos mínimos necesarios y agrupamos en memoria
            // para evitar consultas pesadas que puedan fallar con la conexión intermitente.
            var publicidades = await _context.Publicidades
                .Select(p => new { p.EmpresaId, p.FechaFin })
                .ToListAsync();

            var publicidadesPorEmpresa = publicidades
                .GroupBy(p => p.EmpresaId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var empresasADesactivar = empresas
                .Where(e => e.Activo)
                .Where(e =>
                {
                    if (!publicidadesPorEmpresa.TryGetValue(e.Id, out var pubs)) return false;
                    var todasVencidas = pubs.All(p => p.FechaFin.Date < hoy);
                    if (!todasVencidas) return false;

                    // Si la empresa fue activada manualmente en los últimos 30 días,
                    // le damos un margen para que el usuario pueda registrar una nueva publicidad.
                    if (e.FechaActivacionManual.HasValue && e.FechaActivacionManual.Value.Date >= hace30Dias.Date)
                        return false;

                    return true;
                })
                .ToList();

            if (empresasADesactivar.Count > 0)
            {
                foreach (var emp in empresasADesactivar)
                    emp.Activo = false;
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch
                {
                    // Si no se puede guardar, no bloqueamos la consulta principal.
                }
            }
        }

        return empresas;
    }

    // GET: api/Empresas/5
    [HttpGet("{id}")]
    public async Task<ActionResult<Empresa>> GetEmpresa(int id)
    {
        var empresa = await _context.Empresas.FindAsync(id);

        if (empresa == null)
        {
            return NotFound();
        }

        return empresa;
    }

    // POST: api/Empresas
    [HttpPost]
    public async Task<ActionResult<Empresa>> PostEmpresa(Empresa empresa)
    {
        var nitNormalizado = empresa.Nit.Trim();
        var telefonoNormalizado = empresa.Telefono.Trim();

        var existeNit = await _context.Empresas.AnyAsync(current => current.Nit == nitNormalizado);
        if (existeNit)
        {
            return Conflict(new { mensaje = "Ya existe una empresa registrada con ese NIT." });
        }

        var existeTelefono = await _context.Empresas.AnyAsync(current => current.Telefono == telefonoNormalizado);
        if (existeTelefono)
        {
            return Conflict(new { mensaje = "Ya existe una empresa registrada con ese número de teléfono." });
        }

        empresa.Nit = nitNormalizado;
        empresa.Telefono = telefonoNormalizado;
        empresa.Representante = empresa.Representante.Trim();
        empresa.Cedula = empresa.Cedula.Trim();
        empresa.Activo = empresa.Activo;
        empresa.FechaCreacion = DateTime.UtcNow;

        _context.Empresas.Add(empresa);
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { mensaje = "No fue posible registrar la empresa porque el NIT o el teléfono ya existen." });
        }

        return CreatedAtAction(nameof(GetEmpresa), new { id = empresa.Id }, empresa);
    }

    // PUT: api/Empresas/5
    [HttpPut("{id}")]
    public async Task<ActionResult<Empresa>> PutEmpresa(int id, [FromBody] Empresa datos)
    {
        var empresa = await _context.Empresas.FindAsync(id);
        if (empresa == null)
            return NotFound();

        // No permitir desactivar manualmente una empresa que tenga publicidades vigentes.
        var hoy = DateTime.UtcNow.Date;
        if (datos.Activo == false && empresa.Activo)
        {
            var tieneVigentes = await _context.Publicidades.AnyAsync(p =>
                p.EmpresaId == id && p.FechaFin.Date >= hoy);
            if (tieneVigentes)
            {
                return Conflict(new { mensaje = "No se puede desactivar la empresa porque tiene publicidades vigentes." });
            }

            // Al desactivar manualmente se limpia el margen de activación manual.
            empresa.FechaActivacionManual = null;
        }
        else if (datos.Activo && !empresa.Activo)
        {
            // Registrar la activación manual para dar 30 días de margen
            // antes de una posible desactivación automática por vencimiento.
            empresa.FechaActivacionManual = DateTime.UtcNow;
        }

        empresa.Representante = datos.Representante.Trim();
        empresa.Cedula        = datos.Cedula.Trim();
        empresa.Telefono      = datos.Telefono.Trim();
        empresa.Email         = datos.Email.Trim();
        empresa.Activo        = datos.Activo;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { mensaje = "No fue posible actualizar la empresa." });
        }

        return empresa;
    }
}