using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Net.Backend.Data;
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
        _context.Empresas.Add(empresa);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEmpresa), new { id = empresa.Id }, empresa);
    }
}