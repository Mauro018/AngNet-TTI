// Lista tabular de las empresas registradas en el sistema.
import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Empresa } from '../shared/models/modelo-publicidad';

@Component({
  selector: 'app-lista-empresas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-empresas.component.html',
  styleUrls: ['./lista-empresas.component.css'],
})
export class ListaEmpresasComponent {
  @Input() empresas: Empresa[] = [];
  @Output() editarEmpresa = new EventEmitter<Empresa>();

  // ─── Opciones para el selector de sector ────────────────────
  protected readonly sectoresIndustria = [
    { value: 'TRANSPORTE',               label: 'Transporte' },
    { value: 'TECNOLOGIA',               label: 'Tecnología' },
    { value: 'SALUD',                    label: 'Salud' },
    { value: 'GOBIERNO_E_INST_PUBLICAS', label: 'Gobierno e Inst. Públicas' },
    { value: 'ALIMENTOS',                label: 'Alimentos' },
    { value: 'COMERCIO',                 label: 'Comercio' },
    { value: 'ASEO',                     label: 'Aseo' },
    { value: 'FINANCIERO',               label: 'Financiero' },
    { value: 'OTROS',                    label: 'Otros' },
  ];

  // ─── Estado de los filtros ──────────────────────────────────
  buscarItem     = '';
  seleccionarSector = '';
  seleccionarEstado = '';

  /** true si hay al menos un filtro activo → muestra el botón "Limpiar filtros" */
  get hasActiveFilters(): boolean {
    return !!(this.buscarItem.trim() || this.seleccionarSector || this.seleccionarEstado);
  }

  /**
   * Lista con los 3 filtros aplicados.
   * - Texto: busca en nombre, NIT, representante y cédula (sin distinción de mayúsculas).
   * - Sector: coincidencia exacta con el valor enum.
   * - Estado: coincidencia exacta ('Activa' | 'Inactiva').
   * Una cadena vacía en sector/estado equivale a "sin filtro".
   */
  get filteredEmpresas(): Empresa[] {
    const term = this.buscarItem.trim().toLowerCase();
    return this.empresas.filter(e => {
      const matchesSearch =
        !term ||
        e.nombre.toLowerCase().includes(term)         ||
        e.nit.toLowerCase().includes(term)            ||
        e.representante.toLowerCase().includes(term)  ||
        e.cedula.toLowerCase().includes(term);

      const matchesSector = !this.seleccionarSector || e.sectorIndustria === this.seleccionarSector;
      const matchesEstado = !this.seleccionarEstado || e.estado          === this.seleccionarEstado;

      return matchesSearch && matchesSector && matchesEstado;
    });
  }

  clearFilters(): void {
    this.buscarItem     = '';
    this.seleccionarSector = '';
    this.seleccionarEstado = '';
    this.currentPage    = 1;
  }


  // ---------------------- Paginación ------------------------------
  currentPage = 1;
  readonly itemsPerPage = 10;

  /** Se ejecuta cada vez que el @Input `empresas` cambia.
   *  Vuelve a la página 1 para no quedar en una página vacía. */
  ngOnChanges(): void {
    this.currentPage = 1;
  }

  /** Número total de páginas según el tamaño de la lista. */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEmpresas.length / this.itemsPerPage));
  }

  /** Solo el trozo de la lista que corresponde a la página actual. */
  get paginatedEmpresas(): Empresa[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredEmpresas.slice(start, start + this.itemsPerPage);
  }

  /** Primer registro visible en la página actual (para el texto "Mostrando X–Y"). */
  get startIndex(): number {
    return this.filteredEmpresas.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  /** Último registro visible en la página actual. */
  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredEmpresas.length);
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

  protected getStatusClass(status: string): string {
    return `status-badge status-badge--${status.toLowerCase()}`;
  }

  protected getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      Activa: '✓ Activa',
      Inactiva: '✕ Inactiva',
    };
    return labels[status] || status;
  }

  protected getSectorLabel(sector: string): string {
    const labels: { [key: string]: string } = {
      TRANSPORTE:               'Transporte',
      TECNOLOGIA:               'Tecnología',
      SALUD:                    'Salud',
      GOBIERNO_E_INST_PUBLICAS: 'Gobierno e Inst. Públicas',
      ALIMENTOS:                'Alimentos',
      COMERCIO:                 'Comercio',
      ASEO:                     'Aseo',
      FINANCIERO:               'Financiero',
      OTROS:                    'Otros',
    };
    return labels[sector] ?? sector;
  }
}
