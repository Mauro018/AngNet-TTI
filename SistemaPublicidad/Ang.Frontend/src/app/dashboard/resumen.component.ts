// Resumen rápido con tarjetas de estado y métricas principales.
import { Component, Input } from '@angular/core';

import { TarjetaMetrica, TarjetaEstado } from '../shared/models/modelo-publicidad';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [],
  templateUrl: './resumen.component.html',
  styleUrls: ['./resumen.component.css'],
})
export class ResumenComponent {
  @Input() statusCards: TarjetaEstado[] = [];
  @Input() metricCards: TarjetaMetrica[] = [];

  // Construye la clase CSS del tono visual de cada tarjeta métrica.
  protected toneClass(tone: string): string {
    return `metric-card metric-card--${tone}`;
  }
}
