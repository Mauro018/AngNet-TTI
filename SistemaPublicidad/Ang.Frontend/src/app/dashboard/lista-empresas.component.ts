// Lista tabular de las empresas registradas en el sistema.
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Empresa } from '../shared/models/modelo-publicidad';

@Component({
  selector: 'app-lista-empresas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-empresas.component.html',
  styleUrls: ['./lista-empresas.component.css'],
})
export class ListaEmpresasComponent {
  @Input() empresas: Empresa[] = [];

  // Construye la clase CSS según el estado de la empresa.
  // La clase resultante permite pintar la insignia con el color correcto desde el template.
  protected getStatusClass(status: string): string {
    return `status-badge status-badge--${status.toLowerCase()}`;
  }

  // Devuelve una etiqueta visual breve para el estado.
  // Así se conserva una lectura rápida sin perder el valor semántico del estado original.
  protected getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      Activa: '✓ Activa',
      Pendiente: '⋮ Pendiente',
      Suspendida: '✕ Suspendida',
    };
    return labels[status] || status;
  }

  // Convierte la fecha ISO almacenada en una fecha legible para el usuario.
  // Se usa para mostrar cuándo fue registrado cada proveedor dentro de la tabla.
  protected formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
