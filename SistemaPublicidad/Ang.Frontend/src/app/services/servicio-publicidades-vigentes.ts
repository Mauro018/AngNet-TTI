import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../environment/environment';
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
  private readonly urlBase = `${environment.apiUrl}/api/publicidades/vigentes`;

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

  /** Convierte "/api/..." a URL absoluta usando la base del environment. */
  private resolverUrlAbsoluta(url: string): string
  {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    return `${environment.apiUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
