// Tarjeta de bienvenida del panel con el resumen general de la operación.
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-heroe',
  standalone: true,
  imports: [],
  templateUrl: './heroe.component.html',
  styleUrls: ['./heroe.component.css'],
})
export class HeroeComponent {
  @Input() todayLabel = '';
  @Input() headline = '';
  @Input() description = '';
}
