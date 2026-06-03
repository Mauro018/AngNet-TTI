// Lista de publicidades registradas con control visual de vencimiento.
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';

import { Publicidad } from '../shared/models/modelo-publicidad';
import { PublicidadService } from '../services/publicidad';

@Component({
  selector: 'app-lista-publicidades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-publicidades.component.html',
  styleUrls: ['./lista-publicidades.component.css'],
})
export class ListaPublicidadesComponent {
  @Input() publicidades: Publicidad[] = [];
  @Output() editarPublicidad = new EventEmitter<Publicidad>();

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
      return Math.max(1, Math.ceil(this.publicidades.length / this.itemsPerPage));
    }
  
    /** Solo el trozo de la lista que corresponde a la página actual. */
    get paginacionPublicidades(): Publicidad[] {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      return this.publicidades.slice(start, start + this.itemsPerPage);
    }
  
    /** Primer registro visible en la página actual (para el texto "Mostrando X–Y"). */
    get startIndex(): number {
      return this.publicidades.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
    }
  
    /** Último registro visible en la página actual. */
    get endIndex(): number {
      return Math.min(this.currentPage * this.itemsPerPage, this.publicidades.length);
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


