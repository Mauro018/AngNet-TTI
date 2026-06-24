import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_URL } from './detectar-api';
import {
  PublicidadVigente,
  TipoPantallaPublicidad,
} from '../shared/models/modelo-publicidad-vigente';

/**
 * Servicio que consulta al backend las publicidades vigentes
 * (filtradas opcionalmente por tipo de pantalla). Es la fuente
 * de datos que consumen el reproductor y la vista previa.
 */
@Injectable({ providedIn: 'root' })
export class ServicioPublicidadesVigentes {
  private readonly http = inject(HttpClient);
  private readonly urlBase = `${API_URL}/api/publicidades/vigentes`;

  obtenerVigentes(tipoPantalla?: TipoPantallaPublicidad): Observable<PublicidadVigente[]>
  {
    const opciones = tipoPantalla
      ? { params: { tipoPantalla } }
      : {};
    return this.http
      .get<Array<{
        id: number;
        empresaId: number;
        empresaNombre: string;
        nombrePublicidad: string;
        tipoPantalla: TipoPantallaPublicidad;
        duracionVideoSegundos: number;
        fechaInicio: string;
        fechaFin: string;
        urlVideo: string;
      }>>(this.urlBase, opciones)
      .pipe(
        map((lista) =>
          lista.map<PublicidadVigente>((p) => ({
            id: p.id,
            empresaId: p.empresaId,
            empresaNombre: p.empresaNombre,
            nombrePublicidad: p.nombrePublicidad,
            tipoPantalla: p.tipoPantalla,
            duracionVideoSegundos: p.duracionVideoSegundos,
            fechaInicio: p.fechaInicio?.slice(0, 10) ?? '',
            fechaFin: p.fechaFin?.slice(0, 10) ?? '',
            urlVideo: this.resolverUrlAbsoluta(p.urlVideo),
          }))
        )
      );
  }

  /**
   * Versión liviana: consulta un endpoint que devuelve únicamente un
   * hash calculado en el backend sobre los campos que pueden cambiar
   * (id, nombre, video, duración, fechas). Sirve para que el
   * reproductor haga un polling barato cada 5s sin descargar la
   * lista completa.
   */
  obtenerVersionVigentes(tipoPantalla?: TipoPantallaPublicidad): Observable<VersionVigentes>
  {
    const opciones = tipoPantalla
      ? { params: { tipoPantalla } }
      : {};
    return this.http
      .get<VersionVigentes>(`${API_URL}/api/publicidades/version-vigentes`, opciones);
  }

  /**
   * Versión liviana GLOBAL: hash sobre TODAS las publicidades
   * (vigentes, vencidas y por tipo). Sirve para que el panel
   * principal detecte altas, bajas, ediciones o cambios de video
   * en cualquier publicidad sin descargar la lista completa.
   */
  obtenerVersionGlobal(): Observable<VersionGlobal>
  {
    return this.http.get<VersionGlobal>(`${API_URL}/api/publicidades/version-global`);
  }

  /** Convierte "/api/..." a URL absoluta usando la base detectada del host. */
  private resolverUrlAbsoluta(url: string): string
  {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API_URL.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}

export interface VersionVigentes {
  tipoPantalla: string;
  total: number;
  hash: string;
  servidor: string;
}

export interface VersionGlobal {
  total: number;
  hash: string;
  servidor: string;
}
