// Lista tabular de las empresas registradas en el sistema.
import { Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Output() editarEmpresa = new EventEmitter<Empresa>();

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
