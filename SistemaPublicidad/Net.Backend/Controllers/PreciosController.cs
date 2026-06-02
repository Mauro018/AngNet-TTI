using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaPublicidad.Net.Backend.Data;
using SistemaPublicidad.Net.Backend.Models;
using SistemaPublicidad.Net.Backend.Dtos;

namespace Net.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PreciosController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public PreciosController(ApplicationDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetPrecios()
        {
            var precios = await _db.Precios
                .OrderBy(p => p.TipoPantalla)
                .ThenBy(p => p.DuracionSegundos)
                .Select(p => new PrecioRespuesta
                {
                    Id = p.Id,
                    TipoPantalla = p.TipoPantalla,
                    DuracionSegundos = p.DuracionSegundos,
                    PrecioMensual = p.PrecioMensual,
                    FechaCreacion = p.FechaCreacion
                })
                .ToListAsync();

            return Ok(precios);
        }

        // Reemplaza todas las entradas de precios por la lista enviada.
        [HttpPost]
        public async Task<IActionResult> SetPrecios([FromBody] List<PrecioCrearSolicitud> entradas)
        {
            if (entradas == null)
            {
                return BadRequest();
            }

            // Limpia y reemplaza
            var existing = await _db.Precios.ToListAsync();
            _db.Precios.RemoveRange(existing);

            var entidades = entradas.Select(e => new Precio
            {
                TipoPantalla = e.TipoPantalla,
                DuracionSegundos = e.DuracionSegundos,
                PrecioMensual = e.PrecioMensual
            }).ToList();

            await _db.Precios.AddRangeAsync(entidades);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
