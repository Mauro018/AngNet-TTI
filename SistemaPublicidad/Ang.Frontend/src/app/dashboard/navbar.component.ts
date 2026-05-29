// Barra superior que permite cambiar entre el inicio, empresas y publicidades.
import { Component, EventEmitter, Input, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface SeccionNavegacion {
  id: string;
  label: string;
  count?: number;
  alert?: 'warning' | 'danger';
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class Navbar implements OnInit, OnDestroy {
  @Input() activeSection: string = 'Inicio';
  @Input() sections: SeccionNavegacion[] = [];
  @Input() brandName: string = 'Terminal de Transporte';

  @Output() sectionSelected = new EventEmitter<string>();

  // Tema: 'light' | 'dark' mantenido en localStorage y aplicado al elemento raíz.
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  protected tema: 'light' | 'dark' = 'light';

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = this.document.defaultView?.localStorage.getItem('tema');
      if (saved === 'dark' || saved === 'light') {
        this.tema = saved as 'light' | 'dark';
      }
      this.applyTema(this.tema);
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Escucha cambios en localStorage desde otras pestañas y aplica el tema.
      this.document.defaultView?.addEventListener('storage', this.handleStorageEvent);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document.defaultView?.removeEventListener('storage', this.handleStorageEvent);
    }
  }

  private handleStorageEvent = (ev: StorageEvent) => {
    if (ev.key === 'tema' && (ev.newValue === 'light' || ev.newValue === 'dark')) {
      this.tema = ev.newValue as 'light' | 'dark';
      // Aplicar tema sin volver a escribir en localStorage (ya lo hizo la otra pestaña).
      this.document.documentElement.setAttribute('data-theme', this.tema);
    }
  };

  private applyTema(t: 'light' | 'dark'): void {
    this.document.documentElement.setAttribute('data-theme', t);
    if (isPlatformBrowser(this.platformId)) {
      this.document.defaultView?.localStorage.setItem('tema', t);
    }
  }

  protected toggleTema(): void {
    this.tema = this.tema === 'light' ? 'dark' : 'light';
    this.applyTema(this.tema);
  }

  // Texto que indica la acción: mostrar 'Oscuro' cuando está en claro (cambiar a oscuro).
  protected get temaLabel(): string {
    return this.tema === 'light' ? 'Oscuro' : 'Claro';
  }

  // Notifica al panel principal qué sección debe mostrarse.
  selectSection(sectionId: string): void {
    this.sectionSelected.emit(sectionId);
  }

  // Devuelve la clase CSS que pinta la alerta de la pestaña Publicidades.
  getAlertClass(alert?: 'warning' | 'danger'): string {
    if (alert === 'danger') return 'navbar__alert--danger';
    if (alert === 'warning') return 'navbar__alert--warning';
    return '';
  }
}
