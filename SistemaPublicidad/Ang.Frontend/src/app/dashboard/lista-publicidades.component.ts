// Lista de publicidades registradas con control visual de vencimiento.
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Publicidad } from '../shared/models/modelo-publicidad';
import { PublicidadService } from '../services/publicidad';

@Component({
  selector: 'app-lista-publicidades',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-publicidades.component.html',
  styleUrls: ['./lista-publicidades.component.css'],
})
export class ListaPublicidadesComponent implements OnChanges {
  @Input() publicidades: Publicidad[] = [];
  @Output() editarPublicidad = new EventEmitter<Publicidad>();

  // ─── Opciones para el selector de tiempo en meses ────────────────────
  protected readonly opcionesDuracionMeses = [
    { value: 1, label: '1 mes' },
    { value: 2, label: '2 meses' },
    { value: 3, label: '3 meses' },
    { value: 4, label: '4 meses' },
    { value: 5, label: '5 meses' },
    { value: 6, label: '6 meses' },
    { value: 7, label: '7 meses' },
    { value: 8, label: '8 meses' },
    { value: 9, label: '9 meses' },
    { value: 10, label: '10 meses' },
    { value: 11, label: '11 meses' },
    { value: 12, label: '12 meses' },
  ];

  // ─── Opciones para el selector de tiempo en segundos ────────────────────
  protected readonly opcionesDuracionSegundos = [
    { value: 10, label: '10 segundos' },
    { value: 15, label: '15 segundos' },
    { value: 20, label: '20 segundos' },
    { value: 25, label: '25 segundos' },
    { value: 30, label: '30 segundos' },
  ];

  // ─── Estado de los filtros ──────────────────────────────────
  buscarItem     = '';
  seleccionarMeses = '';
  seleccionarSegundos = '';

  /** true si hay al menos un filtro activo → muestra el botón "Limpiar filtros" */
  get hasActiveFilters(): boolean {
    return !!(this.buscarItem.trim() || this.seleccionarMeses || this.seleccionarSegundos);
  }

  /** Lista con los 3 filtros aplicados.
   * - Texto: busca en nombre publicidad, nombre empresa (sin distinción de mayúsculas).
   * - Meses: coincidencia exacta con el valor numérico de meses.
   * - Segundos: coincidencia exacta con el valor numérico de segundos.
   * Una cadena vacía en meses/segundos equivale a "sin filtro". */
  get filteredPublicidades(): Publicidad[] {
    const term = this.buscarItem.trim().toLowerCase();
    return this.publicidades.filter(p => {
      const matchesSearch =
        !term ||
        p.nombrePublicidad.toLowerCase().includes(term) ||
        p.empresaNombre.toLowerCase().includes(term);

      const matchesMeses = !this.seleccionarMeses || p.duracionMeses === +this.seleccionarMeses;
      const matchesSegundos = !this.seleccionarSegundos || p.duracionVideoSegundos === +this.seleccionarSegundos;

      return matchesSearch && matchesMeses && matchesSegundos;
    });
  }

  clearFilters(): void {
    this.buscarItem     = '';
    this.seleccionarMeses = '';
    this.seleccionarSegundos = '';
    this.currentPage    = 1;
  }

  // ---------------------- Paginación ------------------------------
  currentPage = 1;
    readonly itemsPerPage = 10;

    /** Se ejecuta cada vez que el @Input `publicidades` cambia.
     *  Vuelve a la página 1 para no quedar en una página vacía. */
    ngOnChanges(): void {
      this.currentPage = 1;
    }

    /** Número total de páginas según el tamaño de la lista. */
    get totalPages(): number {
      return Math.max(1, Math.ceil(this.filteredPublicidades.length / this.itemsPerPage));
    }

    /** Solo el trozo de la lista que corresponde a la página actual. */
    get paginacionPublicidades(): Publicidad[] {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.filteredPublicidades.slice(start, start + this.itemsPerPage);
    }

    /** Primer registro visible en la página actual (para el texto "Mostrando X–Y"). */
    get startIndex(): number {
      return this.filteredPublicidades.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
    }

    /** Último registro visible en la página actual. */
    get endIndex(): number {
      return Math.min(this.currentPage * this.itemsPerPage, this.filteredPublicidades.length);
    }

    /**
     * Genera el array de botones del paginador.
     * `null` representa "…" (puntos suspensivos) para saltos grandes.
     *
     * Ejemplos:
     *   5 páginas → [1, 2, 3, 4, 5]
     *   Página 1 de 10 → [1, 2, 3, 4, 5, null, 10]
     *   Página 5 de 10 → [1, null, 4, 5, 6, null, 10]
     *   Página 9 de 10 → [1, null, 6, 7, 8, 9, 10]
     */
    get pageNumbers(): (number | null)[] {
      const total = this.totalPages;
      if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }

      const cur = this.currentPage;

      if (cur <= 4) {
        return [1, 2, 3, 4, 5, null, total];
      }
      if (cur >= total - 3) {
        return [1, null, total - 4, total - 3, total - 2, total - 1, total];
      }
      return [1, null, cur - 1, cur, cur + 1, null, total];
    }

    goToPage(page: number): void {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
      }
    }

    prevPage(): void { this.goToPage(this.currentPage - 1); }
    nextPage(): void { this.goToPage(this.currentPage + 1); }

  constructor(private readonly publicidadService: PublicidadService) {}

  protected getDaysRemaining(endDate: string): number {
    const today = new Date();
    const date = new Date(`${endDate}T23:59:59`);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  protected getStatusClass(publicidad: Publicidad): string {
    const d = this.getDaysRemaining(publicidad.fechaFin);
    if (d < 0)  return 'status-badge status-badge--expired';
    if (d < 3)  return 'status-badge status-badge--danger';
    if (d < 7)  return 'status-badge status-badge--warning';
    return 'status-badge status-badge--success';
  }

  protected getStatusLabel(publicidad: Publicidad): string {
    const d = this.getDaysRemaining(publicidad.fechaFin);
    if (d < 0)  return 'Vencida';
    if (d < 3)  return 'Vence pronto';
    if (d < 7)  return 'Vence esta semana';
    return 'Activa';
  }

  protected formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected tieneVideo(publicidad: Publicidad): boolean {
    return !!publicidad.videoNombreArchivo;
  }

  protected urlVer(publicidad: Publicidad): string {
    return this.publicidadService.getUrlVideo(publicidad.id);
  }

  protected urlDescargar(publicidad: Publicidad): string {
    return this.publicidadService.getUrlDescarga(publicidad.id);
  }
}


