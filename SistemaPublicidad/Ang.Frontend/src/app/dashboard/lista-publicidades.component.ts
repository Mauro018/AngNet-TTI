// Lista de publicidades registradas con control visual de vencimiento.
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

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


