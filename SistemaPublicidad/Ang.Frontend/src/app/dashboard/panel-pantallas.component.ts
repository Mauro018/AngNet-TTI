import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
  afterNextRender,
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ServicioPantallasSignalR } from '../services/servicio-pantallas-signalr';
import { TipoPantallaPublicidad } from '../shared/models/modelo-publicidad-vigente';

/**
 * Tipos de pantalla que se muestran como tarjetas con un enlace
 * que se puede copiar o abrir. Cada uno apunta a la ruta
 * `/pantalla/:tipoPantalla` del reproductor a pantalla completa.
 */
interface TarjetaPantalla {
  id: TipoPantallaPublicidad;
  titulo: string;
  descripcion: string;
  orientacion: 'vertical' | 'horizontal';
  url: string;
  qr: string;
}

@Component({
  selector: 'app-panel-pantallas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './panel-pantallas.component.html',
  styleUrls: ['./panel-pantallas.component.css'],
})
export class PanelPantallasComponent
{
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly signalr = inject(ServicioPantallasSignalR);

  /** IP que el usuario ingresa para "agregar" un dispositivo por IP. */
  protected readonly ipIngresada = signal<string>('');
  /** Estado del último intento de "agregar" una pantalla. */
  protected readonly estadoUltimoRegistro = signal<'ok' | 'error' | 'vacio' | null>(null);
  /** Mensaje del último estado. */
  protected readonly mensajeUltimoRegistro = signal<string>('');
  /** Pantalla recién registrada (muestra la URL lista para abrir). */
  protected readonly ultimaPantallaRegistrada = signal<TarjetaPantalla | null>(null);

  /** Tarjetas con los enlaces pre-generados. Se hidratan en el navegador. */
  protected readonly tarjetas = signal<TarjetaPantalla[]>([]);
  /** Estado de la conexión SignalR (para mostrar si las pantallas están "vivas"). */
  protected readonly estadoConexion = this.signalr.estadoConexion;

  /** Identificador personalizado para la próxima pantalla. */
  protected readonly identificadorPantalla = signal<string>('');

  constructor()
  {
    // Solo se ejecuta en el navegador para evitar window/document en SSR.
    afterNextRender(() => this.construirTarjetas());
  }

  /**
   * Genera las tarjetas con los enlaces a las dos rutas del reproductor.
   * Usa la IP/host que el usuario está usando para acceder al panel.
   */
  private construirTarjetas(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    const origen = this.document.defaultView?.location.origin ?? '';
    this.tarjetas.set([
      {
        id: 'VerticalSamsung',
        titulo: 'Pantalla Vertical Samsung',
        descripcion: 'Pantalla en formato vertical (9:16) ideal para tótems.',
        orientacion: 'vertical',
        url: `${origen}/pantalla/VerticalSamsung`,
        qr: this.generarQrTexto(`${origen}/pantalla/VerticalSamsung`),
      },
      {
        id: 'HorizontalDescenso',
        titulo: 'Pantalla Horizontal Descenso',
        descripcion: 'Pantalla en formato horizontal apaisado (16:9).',
        orientacion: 'horizontal',
        url: `${origen}/pantalla/HorizontalDescenso`,
        qr: this.generarQrTexto(`${origen}/pantalla/HorizontalDescenso`),
      },
    ]);
  }

  /**
   * Genera un QR usando la API pública `api.qrserver.com`.
   * Devuelve la URL de la imagen para usarla como `src` del `<img>`.
   * Si el navegador no tiene internet, devuelve un string vacío.
   */
  private generarQrTexto(url: string): string
  {
    const enc = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${enc}`;
  }

  /** Abre el enlace de la pantalla en una nueva pestaña/ventana. */
  protected abrirEnlace(tarjeta: TarjetaPantalla): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    this.document.defaultView?.open(tarjeta.url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Copia un texto al portapapeles. Si la API moderna no está
   * disponible, usa el fallback de `textarea` + `execCommand`.
   */
  protected async copiar(texto: string): Promise<void>
  {
    if (!isPlatformBrowser(this.platformId)) return;
    try
    {
      if (navigator.clipboard && window.isSecureContext)
      {
        await navigator.clipboard.writeText(texto);
        this.flashOk(`Enlace copiado: ${texto}`);
        return;
      }
    }
    catch { /* cae al fallback */ }

    const textarea = this.document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    this.document.body.appendChild(textarea);
    textarea.select();
    try
    {
      this.document.execCommand('copy');
      this.flashOk(`Enlace copiado: ${texto}`);
    }
    catch
    {
      this.flashError('No se pudo copiar. Cópialo manualmente: ' + texto);
    }
    finally
    {
      this.document.body.removeChild(textarea);
    }
  }

  /**
   * "Registra" un dispositivo a partir de su IP. Como tal registro no
   * persiste (es web, no nativo), lo que hacemos es construir un enlace
   * directo a la pantalla en el host actual, que es el comportamiento
   * que tiene sentido: la IP ingresada se valida y luego se genera el
   * link que el usuario abrirá desde ese dispositivo.
   */
  protected registrarPantallaPorIp(): void
  {
    const ip = (this.ipIngresada() || '').trim();
    if (!ip)
    {
      this.estadoUltimoRegistro.set('vacio');
      this.mensajeUltimoRegistro.set('Ingresa una IP válida para registrar la pantalla.');
      return;
    }
    if (!this.esIpValida(ip))
    {
      this.estadoUltimoRegistro.set('error');
      this.mensajeUltimoRegistro.set('La IP no tiene un formato válido (ej. 192.168.1.50).');
      return;
    }

    const identificador = (this.identificadorPantalla() || '').trim() || `Pantalla-${ip}`;
    const protocolo = this.document.defaultView?.location.protocol ?? 'http:';
    const puerto = this.document.defaultView?.location.port ? `:${this.document.defaultView.location.port}` : '';
    const url = `${protocolo}//${ip}${puerto}/pantalla/VerticalSamsung?cliente=${encodeURIComponent(identificador)}`;

    const tarjeta: TarjetaPantalla = {
      id: 'VerticalSamsung',
      titulo: `Pantalla registrada: ${identificador}`,
      descripcion: `Abre el siguiente enlace en el dispositivo con IP ${ip}.`,
      orientacion: 'vertical',
      url,
      qr: this.generarQrTexto(url),
    };

    this.ultimaPantallaRegistrada.set(tarjeta);
    this.estadoUltimoRegistro.set('ok');
    this.mensajeUltimoRegistro.set(`Pantalla "${identificador}" lista para abrirse desde ${ip}.`);
  }

  private esIpValida(ip: string): boolean
  {
    const partes = ip.split('.');
    if (partes.length !== 4) return false;
    return partes.every((p) => {
      const n = Number(p);
      return Number.isInteger(n) && n >= 0 && n <= 255 && p === String(n);
    });
  }

  private flashOk(msg: string): void
  {
    this.estadoUltimoRegistro.set('ok');
    this.mensajeUltimoRegistro.set(msg);
  }
  private flashError(msg: string): void
  {
    this.estadoUltimoRegistro.set('error');
    this.mensajeUltimoRegistro.set(msg);
  }
}
