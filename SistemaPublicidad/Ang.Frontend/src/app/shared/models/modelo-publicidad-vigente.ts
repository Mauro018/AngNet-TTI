export type TipoPantallaPublicidad = 'VerticalSamsung' | 'HorizontalDescenso';

/**
 * Publicidad vigente con la información mínima que necesitan
 * el reproductor y la vista previa para mostrar el video.
 */
export interface PublicidadVigente {
  id: number;
  empresaId: number;
  empresaNombre: string;
  nombrePublicidad: string;
  tipoPantalla: TipoPantallaPublicidad;
  duracionVideoSegundos: number;
  fechaInicio: string;
  fechaFin: string;
  urlVideo: string;
}
