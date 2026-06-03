import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { Empresa, SectorIndustriaEmpresa } from '../shared/models/modelo-publicidad';

interface EmpresaApi {
  id: number;
  nombre: string;
  nit: string;
  representante: string;
  cedula: string;
  sectorIndustria: string;
  telefono: string;
  email: string;
  activo: boolean;
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

  editarEmpresa(id: number, empresa: Omit<Empresa, 'id'>): Observable<Empresa> {
    return this.http.put<EmpresaApi>(`${this.apiUrl}/${id}`, this.mapParaApi(empresa)).pipe(
      map((response) => this.mapDesdeApi(response))
    );
  }

  private mapDesdeApi(empresa: EmpresaApi): Empresa {
    return {
      id: empresa.id,
      nombre: empresa.nombre,
      nit: empresa.nit,
      representante: empresa.representante,
      cedula: empresa.cedula,
      sectorIndustria: empresa.sectorIndustria as SectorIndustriaEmpresa,
      telefono: empresa.telefono,
      correo: empresa.email,
      estado: empresa.activo ? 'Activa' : 'Inactiva',
      fechaRegistro: new Date(empresa.fechaCreacion).toISOString().slice(0, 10),
    };
  }

  private mapParaApi(empresa: Omit<Empresa, 'id'>): Omit<EmpresaApi, 'id'> {
    return {
      nombre: empresa.nombre.trim(),
      nit: empresa.nit.trim(),
      representante: empresa.representante.trim(),
      cedula: empresa.cedula.trim(),
      sectorIndustria: empresa.sectorIndustria,
      telefono: empresa.telefono.trim(),
      email: empresa.correo.trim(),
      activo: empresa.estado === 'Activa',
      fechaCreacion: new Date().toISOString(),
    };
  }
}
