// Lista de publicidades registradas con control visual de vencimiento.
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { Publicidad } from '../shared/models/modelo-publicidad';

@Component({
  selector: 'app-lista-publicidades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-publicidades.component.html',
  styleUrls: ['./lista-publicidades.component.css'],
})
export class ListaPublicidadesComponent {
  @Input() publicidades: Publicidad[] = [];

  // Calcula los días restantes entre hoy y la fecha de vencimiento.
  // El cálculo alimenta tanto la alerta visual como el texto descriptivo de cada fila.
  protected getDaysRemaining(endDate: string): number {
    const today = new Date();
    const date = new Date(`${endDate}T23:59:59`);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Selecciona la clase visual según la proximidad al vencimiento.
  // El template usa esta clase para mostrar peligro, advertencia o estado normal.
  protected getStatusClass(publicidad: Publicidad): string {
    const remainingDays = this.getDaysRemaining(publicidad.fechaFin);

    if (remainingDays < 3) {
      return 'status-badge status-badge--danger';
    }

    if (remainingDays < 7) {
      return 'status-badge status-badge--warning';
    }

    return 'status-badge status-badge--success';
  }

  // Devuelve un texto corto para que el usuario entienda el estado rápidamente.
  // Se favorecen mensajes de uso inmediato porque esta tabla está pensada para consulta rápida.
  protected getStatusLabel(publicidad: Publicidad): string {
    const remainingDays = this.getDaysRemaining(publicidad.fechaFin);

    if (remainingDays < 0) {
      return 'Vencida';
    }

    if (remainingDays < 3) {
      return 'Vence pronto';
    }

    if (remainingDays < 7) {
      return 'Vence esta semana';
    }

    return 'Activa';
  }

  // Convierte la fecha ISO en un formato compacto de lectura rápida.
  // Mantiene el estilo de fecha homogéneo en toda la interfaz del panel.
  protected formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
