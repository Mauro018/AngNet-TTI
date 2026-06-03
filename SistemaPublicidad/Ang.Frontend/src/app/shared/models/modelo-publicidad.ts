// Tipos compartidos para mantener consistencia entre tarjetas, listas y formularios.
export type TonoPanel = 'success' | 'info' | 'warning' | 'neutral';

export type EstadoPublicidad = 'Programada' | 'Activa' | 'Pausada' | 'Finalizada';

export type SeveridadActividad = 'success' | 'warning' | 'info';

export type EstadoEmpresa = 'Activa' | 'Inactiva';

export type TipoPantallaPublicidad = 'VerticalSamsung' | 'HorizontalDescenso';

// Elemento visible en la barra superior de navegación.
export interface ElementoNavegacion {
  label: string;
  description: string;
  active?: boolean;
}

// Tarjeta utilizada en el resumen de métricas del inicio.
export interface TarjetaMetrica {
  label: string;
  value: string;
  note: string;
  tone: TonoPanel;
}

// Tarjeta de estado que resume una condición general del sistema.
export interface TarjetaEstado {
  label: string;
  value: string;
  description: string;
}

export type SectorIndustriaEmpresa =
  | 'TRANSPORTE'
  | 'TECNOLOGIA'
  | 'SALUD'
  | 'GOBIERNO_E_INST_PUBLICAS'
  | 'ALIMENTOS'
  | 'COMERCIO'
  | 'ASEO'
  | 'FINANCIERO'
  | 'OTROS';

// Representa una empresa registrada en el sistema.
export interface Empresa {
  id: number;
  nombre: string;
  nit: string;
  representante: string;
  cedula: string;
  sectorIndustria: SectorIndustriaEmpresa;
  telefono: string;
  correo: string;
  estado: EstadoEmpresa;
  fechaRegistro: string;
}

// Registro de una publicidad asociada a una empresa específica.
export interface Publicidad {
  id: number;
  empresaId: number;
  empresaNombre: string;
  empresaNit: string;
  sectorIndustria: string;
  nombrePublicidad: string;
  tipoPantalla: TipoPantallaPublicidad;
  duracionVideoSegundos: number;
  duracionMeses: number;
  fechaInicio: string;
  fechaFin: string;
  diasDuracion: number;
  observaciones: string;
  videoNombreArchivo: string;
}
