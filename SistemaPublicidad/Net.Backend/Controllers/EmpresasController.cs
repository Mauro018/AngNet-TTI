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
        var hoy = DateTime.UtcNow.Date;
        var empresasADesactivar = await _context.Empresas
            .Where(e => e.Activo && e.Publicidades.Any() && e.Publicidades.All(p => p.FechaFin.Date < hoy))
            .ToListAsync();

        if (empresasADesactivar.Count > 0)
        {
            foreach (var emp in empresasADesactivar)
                emp.Activo = false;
            await _context.SaveChangesAsync();
        }

        return await _context.Empresas.ToListAsync();
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
}