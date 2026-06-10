import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';

import { environment } from '../environment/environment';
import { TipoPantallaPublicidad } from '../shared/models/modelo-publicidad-vigente';

/**
 * Servicio que mantiene una única conexión SignalR contra el hub
 * `/hubpantallas` del backend. Cualquier componente (reproductor o
 * vista previa) puede suscribirse a los eventos para reflejar en
 * vivo las publicidades vigentes y reaccionar a vencimientos.
 */
@Injectable({ providedIn: 'root' })
export class ServicioPantallasSignalR {
  private conexion?: signalR.HubConnection;
  private readonly contadoresListeners = new Map<string, number>();

  /** Estado público de la conexión. */
  readonly estadoConexion = signal<'desconectado' | 'conectando' | 'conectado' | 'reconectando' | 'cerrado'>(
    'desconectado'
  );

  /** Tipos de pantalla en los que está suscrita esta instancia. */
  private readonly tiposSuscritos = new Set<TipoPantallaPublicidad>();

  /** Inicia la conexión al hub si aún no está activa. */
  private async asegurarConexion(): Promise<void> {
    if (this.conexion) return;

    const urlBase = environment.apiUrl.replace(/\/$/, '');
    this.conexion = new signalR.HubConnectionBuilder()
      .withUrl(`${urlBase}/hubpantallas`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.conexion.onreconnecting(() => this.estadoConexion.set('reconectando'));
    this.conexion.onreconnected(() => this.estadoConexion.set('conectado'));
    this.conexion.onclose(() => this.estadoConexion.set('cerrado'));

    try
    {
      this.estadoConexion.set('conectando');
      await this.conexion.start();
      this.estadoConexion.set('conectado');

      // Re-registra los grupos luego de una reconexión.
      this.conexion.onreconnected(async () =>
      {
        for (const tipo of this.tiposSuscritos)
        {
          try
          {
            await this.conexion!.invoke('RegistrarPantalla', tipo, `${tipo}_cliente`);
          }
          catch (err)
          {
            console.warn('No se pudo re-registrar la pantalla', err);
          }
        }
      });
    }
    catch (error)
    {
      this.estadoConexion.set('desconectado');
      console.error('No fue posible conectar al HubPantallas', error);
      throw error;
    }
  }

  /** Une la sesión actual al grupo de un tipo de pantalla. */
  async unirAPantalla(tipoPantalla: TipoPantallaPublicidad): Promise<void>
  {
    await this.asegurarConexion();
    this.tiposSuscritos.add(tipoPantalla);
    const clave = `invocar:RegistrarPantalla:${tipoPantalla}`;
    this.contadoresListeners.set(clave, (this.contadoresListeners.get(clave) ?? 0) + 1);
    if (!this.conexion) return;
    try
    {
      await this.conexion.invoke('RegistrarPantalla', tipoPantalla, `${tipoPantalla}_cliente`);
    }
    catch (error)
    {
      console.error('No se pudo registrar la pantalla', error);
    }
  }

  /** Se desuscribe del grupo de un tipo de pantalla. */
  async desunirDePantalla(tipoPantalla: TipoPantallaPublicidad): Promise<void>
  {
    if (!this.conexion) return;
    this.tiposSuscritos.delete(tipoPantalla);
    if (this.conexion.state === signalR.HubConnectionState.Connected)
    {
      try
      {
        await this.conexion.invoke('RefrescarVigentes', tipoPantalla);
      }
      catch { /* sin acciones */ }
    }
  }

  /** Registra un listener para un evento del hub. */
  on<T>(nombreEvento: string, handler: (payload: T) => void): void
  {
    if (!this.conexion)
    {
      // Si aún no hay conexión, intenta iniciarla en segundo plano.
      this.asegurarConexion().then(() => this.conexion?.on(nombreEvento, handler));
      return;
    }
    this.conexion.on(nombreEvento, handler);
  }

  /** Quita un listener previamente registrado. */
  off<T>(nombreEvento: string, handler?: (payload: T) => void): void
  {
    if (!this.conexion) return;
    if (handler)
    {
      this.conexion.off(nombreEvento, handler);
    }
    else
    {
      this.conexion.off(nombreEvento);
    }
  }

  /** Cierra la conexión cuando ya no se necesita. */
  async cerrar(): Promise<void>
  {
    if (this.conexion)
    {
      try { await this.conexion.stop(); } catch { /* sin acciones */ }
      this.conexion = undefined;
      this.estadoConexion.set('cerrado');
    }
  }
}
