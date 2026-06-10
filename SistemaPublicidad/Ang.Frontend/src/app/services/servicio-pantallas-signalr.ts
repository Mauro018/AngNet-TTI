import { Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject, filter, map, share, takeUntil } from 'rxjs';
import * as signalR from '@microsoft/signalr';

import { environment } from '../environment/environment';
import { TipoPantallaPublicidad } from '../shared/models/modelo-publicidad-vigente';

/**
 * Servicio que mantiene una única conexión SignalR contra el hub
 * `/hubpantallas` del backend. Cualquier componente (reproductor o
 * vista previa) puede suscribirse a los eventos para reflejar en
 * vivo las publicidades vigentes y reaccionar a vencimientos.
 *
 * Internamente:
 *  - Solo abre UNA conexión, sin importar cuántos componentes pidan
 *    unirse al hub.
 *  - Reenvía cada evento del hub por un Observable tipado.
 *  - Cuando se desconecta, libera los grupos en la reconexión.
 */
@Injectable({ providedIn: 'root' })
export class ServicioPantallasSignalR implements OnDestroy
{
  private conexion?: signalR.HubConnection;
  private readonly sujetoDestruir$ = new Subject<void>();
  private readonly gruposSuscritos = new Set<TipoPantallaPublicidad>();
  private readonly contadoresListeners = new Map<string, number>();
  private iniciando = false;

  /** Estado público de la conexión. */
  readonly estadoConexion = signal<'desconectado' | 'conectando' | 'conectado' | 'reconectando' | 'cerrado'>(
    'desconectado'
  );

  /** Stream de eventos "pantallaRegistrada" emitidos por el hub. */
  readonly pantallaRegistrada$ = this.evento<{ connectionId: string; tipoPantalla: string; identificador: string }>('pantallaRegistrada');

  /** Stream de eventos "pantallaConectada". */
  readonly pantallaConectada$ = this.evento<string>('pantallaConectada');

  /** Stream de eventos "publicidadNueva". */
  readonly publicidadNueva$ = this.evento<unknown>('publicidadNueva');

  /** Stream de eventos "publicidadRemovida" (vencidas o eliminadas). */
  readonly publicidadRemovida$ = this.evento<{ tipoPantalla: string; publicidadId: number }>('publicidadRemovida');

  /** Stream de eventos "refrescarVigentes". */
  readonly refrescarVigentes$ = this.evento<string>('refrescarVigentes');

  async ngOnDestroy(): Promise<void>
  {
    this.sujetoDestruir$.next();
    this.sujetoDestruir$.complete();
    await this.cerrar();
  }

  /** Inicia la conexión al hub si aún no está activa. */
  private async asegurarConexion(): Promise<void>
  {
    if (this.conexion && this.conexion.state === signalR.HubConnectionState.Connected) return;
    if (this.iniciando) return;
    this.iniciando = true;

    try
    {
      const urlBase = environment.apiUrl.replace(/\/$/, '');
      this.conexion = new signalR.HubConnectionBuilder()
        .withUrl(`${urlBase}/hubpantallas`)
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.conexion.onreconnecting(() => this.estadoConexion.set('reconectando'));
      this.conexion.onreconnected(() =>
      {
        this.estadoConexion.set('conectado');
        this.revincularGrupos();
      });
      this.conexion.onclose(() => this.estadoConexion.set('cerrado'));

      this.estadoConexion.set('conectando');
      await this.conexion.start();
      this.estadoConexion.set('conectado');
      await this.revincularGrupos();
    }
    catch (error)
    {
      this.estadoConexion.set('desconectado');
      console.error('No fue posible conectar al HubPantallas', error);
      throw error;
    }
    finally
    {
      this.iniciando = false;
    }
  }

  /** Re-une todos los grupos a los que se había suscrito. */
  private async revincularGrupos(): Promise<void>
  {
    if (!this.conexion || this.conexion.state !== signalR.HubConnectionState.Connected) return;
    for (const tipo of this.gruposSuscritos)
    {
      try
      {
        await this.conexion.invoke('RegistrarPantalla', tipo, `${tipo}_cliente`);
      }
      catch (error)
      {
        console.warn('No se pudo re-registrar la pantalla', tipo, error);
      }
    }
  }

  /** Une la sesión actual al grupo de un tipo de pantalla. */
  async unirAPantalla(tipoPantalla: TipoPantallaPublicidad): Promise<void>
  {
    const clave = `RegistrarPantalla:${tipoPantalla}`;
    const prev = this.contadoresListeners.get(clave) ?? 0;
    this.contadoresListeners.set(clave, prev + 1);
    this.gruposSuscritos.add(tipoPantalla);

    if (prev === 0)
    {
      await this.asegurarConexion();
      if (this.conexion && this.conexion.state === signalR.HubConnectionState.Connected)
      {
        try
        {
          await this.conexion.invoke('RegistrarPantalla', tipoPantalla, `${tipoPantalla}_cliente`);
        }
        catch (error)
        {
          console.error('No se pudo registrar la pantalla', error);
        }
      }
    }
  }

  /** Disminuye el contador de listeners. Solo se desuscribe del grupo
   *  cuando ya no quede ningún componente interesado. */
  async desunirDePantalla(tipoPantalla: TipoPantallaPublicidad): Promise<void>
  {
    const clave = `RegistrarPantalla:${tipoPantalla}`;
    const prev = this.contadoresListeners.get(clave) ?? 0;
    if (prev <= 1)
    {
      this.contadoresListeners.delete(clave);
      this.gruposSuscritos.delete(tipoPantalla);
    }
    else
    {
      this.contadoresListeners.set(clave, prev - 1);
    }
  }

  /** Crea un Observable filtrado por nombre de evento. */
  private evento<T>(nombreEvento: string): Observable<T>
  {
    // Devolvemos un observable compartido. La conexión se inicializará
    // al primer subscribe para evitar abrir sockets en SSR.
    return new Observable<T>((subscriber) =>
    {
      let cancelado = false;
      this.asegurarConexion()
        .then(() =>
        {
          if (cancelado || !this.conexion) return;
          const handler = (payload: T) => subscriber.next(payload);
          this.conexion.on(nombreEvento, handler);
          return () =>
          {
            try { this.conexion?.off(nombreEvento, handler); } catch { /* sin acciones */ }
          };
        })
        .catch((err) => subscriber.error(err));

      return () => { cancelado = true; };
    }).pipe(
      takeUntil(this.sujetoDestruir$),
      share()
    );
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
