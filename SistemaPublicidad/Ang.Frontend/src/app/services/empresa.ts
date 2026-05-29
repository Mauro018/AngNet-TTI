import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { Empresa } from '../shared/models/modelo-publicidad';

interface EmpresaApi {
  id: number;
  nombre: string;
  nit: string;
  contacto: string;
  sectorIndustria: string;
  telefono: string;
  email: string;
  direccion: string;
  activo: boolean;
  pendiente: boolean;
  suspendido: boolean;
  fechaCreacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {

  private readonly apiUrl = `${environment.apiUrl}/api/empresas`;

  constructor(private readonly http: HttpClient) { }

  getEmpresas(): Observable<Empresa[]> {
    return this.http.get<EmpresaApi[]>(this.apiUrl).pipe(
      map((empresas) => empresas.map((empresa) => this.mapDesdeApi(empresa)))
    );
  }

  crearEmpresa(empresa: Omit<Empresa, 'id'>): Observable<Empresa> {
    return this.http.post<EmpresaApi>(this.apiUrl, this.mapParaApi(empresa)).pipe(
      map((response) => this.mapDesdeApi(response))
    );
  }

  private mapDesdeApi(empresa: EmpresaApi): Empresa {
    return {
      id: empresa.id,
      nombre: empresa.nombre,
      nit: empresa.nit,
      contacto: empresa.contacto,
      sectorIndustria: empresa.sectorIndustria,
      telefono: empresa.telefono,
      correo: empresa.email,
      direccion: empresa.direccion,
      estado: empresa.suspendido ? 'Suspendida' : empresa.activo ? 'Activa' : 'Pendiente',
      fechaRegistro: new Date(empresa.fechaCreacion).toISOString().slice(0, 10),
    };
  }

  private mapParaApi(empresa: Omit<Empresa, 'id'>): Omit<EmpresaApi, 'id'> {
    return {
      nombre: empresa.nombre.trim(),
      nit: empresa.nit.trim(),
      contacto: empresa.contacto.trim(),
      sectorIndustria: empresa.sectorIndustria.trim(),
      telefono: empresa.telefono.trim(),
      email: empresa.correo.trim(),
      direccion: empresa.direccion.trim(),
      activo: empresa.estado === 'Activa',
      pendiente: empresa.estado === 'Pendiente',
      suspendido: empresa.estado === 'Suspendida',
      fechaCreacion: new Date().toISOString(),
    };
  }
}
