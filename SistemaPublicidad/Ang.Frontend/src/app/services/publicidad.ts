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
    return this.http.post<PublicidadApi>(this.apiUrl, this.mapParaApi(entrada)).pipe(
      map((response) => this.mapDesdeApi(response))
    );
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
    };
  }

  private mapParaApi(entrada: NuevaPublicidadEntrada): NuevaPublicidadEntrada {
    const startIso = new Date(`${entrada.fechaInicio}T00:00:00`).toISOString();
    const endIso = new Date(`${entrada.fechaFin}T23:59:59`).toISOString();

    return {
      empresaId: Number(entrada.empresaId),
      nombrePublicidad: entrada.nombrePublicidad.trim(),
      tipoPantalla: entrada.tipoPantalla,
      duracionVideoSegundos: Number(entrada.duracionVideoSegundos),
      duracionMeses: Number(entrada.duracionMeses),
      fechaInicio: startIso,
      fechaFin: endIso,
      observaciones: entrada.observaciones.trim(),
    };
  }
}
