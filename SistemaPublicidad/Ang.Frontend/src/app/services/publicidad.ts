import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../environment/environment';
import { Publicidad, TipoPantallaPublicidad } from '../shared/models/modelo-publicidad';

export interface NuevaPublicidadEntrada {
  empresaId: number;
  nombrePublicidad: string;
  tipoPantalla: TipoPantallaPublicidad;
  duracionVideoSegundos: number;
  duracionMeses: number;
  fechaInicio: string;
  fechaFin: string;
  observaciones: string;
  video: File;
}

export interface EditarPublicidadEntrada {
  duracionMeses: number;
  fechaInicio: string;
  observaciones: string;
}

interface PublicidadApi {
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

@Injectable({
  providedIn: 'root',
})
export class PublicidadService {
  private readonly apiUrl = `${environment.apiUrl}/api/publicidades`;

  constructor(private readonly http: HttpClient) {}

  getPublicidades(): Observable<Publicidad[]> {
    return this.http.get<PublicidadApi[]>(this.apiUrl).pipe(
      map((publicidades) => publicidades.map((publicidad) => this.mapDesdeApi(publicidad)))
    );
  }

  crearPublicidad(entrada: NuevaPublicidadEntrada): Observable<Publicidad> {
    const formData = new FormData();
    formData.append('empresaId', String(entrada.empresaId));
    formData.append('nombrePublicidad', entrada.nombrePublicidad.trim());
    formData.append('tipoPantalla', entrada.tipoPantalla);
    formData.append('duracionVideoSegundos', String(entrada.duracionVideoSegundos));
    formData.append('duracionMeses', String(entrada.duracionMeses));
    formData.append('fechaInicio', entrada.fechaInicio);
    formData.append('fechaFin', entrada.fechaFin);
    formData.append('observaciones', entrada.observaciones.trim());
    formData.append('video', entrada.video, entrada.video.name);

    return this.http.post<PublicidadApi>(this.apiUrl, formData).pipe(
      map((response) => this.mapDesdeApi(response))
    );
  }

  editarPublicidad(id: number, datos: EditarPublicidadEntrada): Observable<Publicidad> {
    const body = {
      duracionMeses: datos.duracionMeses,
      fechaInicio: datos.fechaInicio,
      observaciones: datos.observaciones.trim(),
    };
    return this.http.put<PublicidadApi>(`${this.apiUrl}/${id}`, body).pipe(
      map((response) => this.mapDesdeApi(response))
    );
  }

  reemplazarVideo(id: number, video: File): Observable<Publicidad> {
    const formData = new FormData();
    formData.append('video', video, video.name);
    return this.http.patch<PublicidadApi>(`${this.apiUrl}/${id}/video`, formData).pipe(
      map((response) => this.mapDesdeApi(response))
    );
  }

  getUrlVideo(id: number): string {
    return `${this.apiUrl}/${id}/video`;
  }

  getUrlDescarga(id: number): string {
    return `${this.apiUrl}/${id}/descarga`;
  }

  private mapDesdeApi(publicidad: PublicidadApi): Publicidad {
    return {
      id: publicidad.id,
      empresaId: publicidad.empresaId,
      empresaNombre: publicidad.empresaNombre,
      empresaNit: publicidad.empresaNit,
      sectorIndustria: publicidad.sectorIndustria,
      nombrePublicidad: publicidad.nombrePublicidad,
      tipoPantalla: publicidad.tipoPantalla,
      duracionVideoSegundos: publicidad.duracionVideoSegundos,
      duracionMeses: publicidad.duracionMeses,
      fechaInicio: publicidad.fechaInicio.slice(0, 10),
      fechaFin: publicidad.fechaFin.slice(0, 10),
      diasDuracion: publicidad.diasDuracion,
      observaciones: publicidad.observaciones,
      videoNombreArchivo: publicidad.videoNombreArchivo,
    };
  }
}


