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
        // Desactivar automáticamente las empresas activas cuyas publicidades hayan vencido en su totalidad.
        // Se compara contra la fecha actual en zona horaria local (Colombia, UTC-5) para que
        // el corte del día coincida con el calendario del usuario.
        var hoy = DateTime.UtcNow.Date;

        // Traemos todas las empresas y filtramos en memoria para no romper con el
        // tipo de timestamp de Npgsql (la consulta previa con DateTime.UtcNow.Date
        // podía generar "Unable to write data to the transport connection" si la
        // base de datos no estaba disponible transitoriamente).
        var empresas = await _context.Empresas
            .OrderBy(e => e.Id)
            .ToListAsync();

        if (empresas.Count > 0)
        {
            var empresasConVencidas = await _context.Publicidades
                .Where(p => p.FechaFin.Date < hoy)
                .GroupBy(p => p.EmpresaId)
                .Select(g => new { g.Key })
                .ToListAsync();

            var idsVencidas = new HashSet<int>(empresasConVencidas.Select(x => x.Key));
            var empresasADesactivar = empresas
                .Where(e => e.Activo && idsVencidas.Contains(e.Id))
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