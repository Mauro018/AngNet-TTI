using Microsoft.EntityFrameworkCore;
using SistemaPublicidad.Net.Backend.Models;

namespace Net.Backend.Data
{
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
    {
        public DbSet<Empresa> Empresas { get; set; }
        public DbSet<Publicidad> Publicidades { get; set; }
        public DbSet<Precio> Precios { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuración de la relación entre Empresa y Publicidad
            modelBuilder.Entity<Publicidad>()
                .HasOne(p => p.Empresa)
                .WithMany(e => e.Publicidades)
                .HasForeignKey(p => p.EmpresaId)
                .OnDelete(DeleteBehavior.Cascade);// Eliminar una empresa eliminará sus publicidades asociadas

            // Índice simple para consultas por tipo y duración
            modelBuilder.Entity<Precio>()
                .HasIndex(p => new { p.TipoPantalla, p.DuracionSegundos });
        }
    }
}