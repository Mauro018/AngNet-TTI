import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';

export interface PrecioApi {
  id: number;
  tipoPantalla: string;
  duracionSegundos: number;
  precioMensual: number;
  fechaCreacion: string;
}

export interface PrecioCreateEntrada {
  tipoPantalla: string;
  duracionSegundos: number;
  precioMensual: number;
}

@Injectable({ providedIn: 'root' })
export class PreciosService {
  private readonly apiUrl = `${environment.apiUrl}/api/precios`;

  constructor(private readonly http: HttpClient) {}

  getPrecios(): Observable<PrecioApi[]> {
    return this.http.get<PrecioApi[]>(this.apiUrl).pipe(map((r) => r || []));
  }

  setPrecios(entradas: PrecioCreateEntrada[]) {
    return this.http.post<void>(this.apiUrl, entradas);
  }
}
