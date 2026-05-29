import { ElementoNavegacion } from '../models/modelo-publicidad';

// Navegación base del panel. Se usa para construir la barra superior.
export const elementosNavegacion: ElementoNavegacion[] = [
  {
    label: 'Inicio',
    description: 'Resumen operativo diario y acceso rápido',
    active: true,
  },
  {
    label: 'Publicidades',
    description: 'Administrar piezas, fechas y prioridad',
  },
  {
    label: 'Espacios',
    description: 'Control de pantallas, vallas y puntos físicos',
  },
  {
    label: 'Calendario',
    description: 'Programación y disponibilidad por franjas',
  },
  {
    label: 'Reportes',
    description: 'KPI, ocupación y rendimiento comercial',
  },
  {
    label: 'Configuración',
    description: 'Parámetros del sistema y perfiles internos',
  },
];

