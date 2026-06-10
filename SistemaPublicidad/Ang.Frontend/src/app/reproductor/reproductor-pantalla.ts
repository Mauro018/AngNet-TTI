import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';

import { PublicidadVigente, TipoPantallaPublicidad } from '../shared/models/modelo-publicidad-vigente';
import { ServicioPublicidadesVigentes } from '../services/servicio-publicidades-vigentes';
import { ServicioPantallasSignalR } from '../services/servicio-pantallas-signalr';

/**
 * Reproductor a pantalla completa pensado para TVs, monitores externos
 * o portátiles. Reproduce en bucle infinito todas las publicidades
 * vigentes del tipo de pantalla indicado en la URL.
 *
 * Eventos SignalR que escucha:
 *  - "PublicidadNueva"       → se vuelve a consultar la lista.
 *  - "PublicidadRemovida"    → se quita del bucle al instante.
 *  - "RefrescarVigentes"     → se recarga la lista completa.
 *
 * La pantalla se actualiza sola cuando el backend detecta vencimientos
 * o cuando se crea una publicidad nueva.
 */
@Component({
  selector: 'app-reproductor-pantalla',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reproductor-pantalla.html',
  styleUrls: ['./reproductor-pantalla.css'],
})
export class ReproductorPantallaComponent implements OnInit, OnDestroy
{
  @ViewChild('video', { static: true })
  private videoRef!: ElementRef<HTMLVideoElement>;

  private readonly ruta = inject(ActivatedRoute);
  private readonly servicioVigentes = inject(ServicioPublicidadesVigentes);
  private readonly signalr = inject(ServicioPantallasSignalR);
  private readonly platformId = inject(PLATFORM_ID);

  /** Tipo de pantalla recibido por la URL. */
  protected readonly tipoPantalla = signal<TipoPantallaPublicidad>('VerticalSamsung');

  /** Cola de publicidades que se reproducen en bucle. */
  protected readonly cola = signal<PublicidadVigente[]>([]);
  /** Publicidad actualmente en reproducción. */
  protected readonly actual = signal<PublicidadVigente | null>(null);
  /** Mensaje para cuando no hay publicidades vigentes. */
  protected readonly mensaje = signal<string>('Conectando con el servidor…');
  /** Identificador de la pantalla para mostrarlo en pantalla. */
  protected readonly identificadorPantalla = signal<string>('');

  async ngOnInit(): Promise<void>
  {
    const tipo = (this.ruta.snapshot.paramMap.get('tipoPantalla') ?? 'VerticalSamsung') as TipoPantallaPublicidad;
    this.tipoPantalla.set(tipo);
    this.identificadorPantalla.set(`Pantalla ${tipo} ${new Date().toLocaleTimeString('es-CO')}`);

    // Suscribirse al grupo del hub correspondiente a este tipo de pantalla.
    await this.signalr.unirAPantalla(this.tipoPantalla());

    // Listeners del hub (tipados con any para mantener compatibilidad con versiones de @microsoft/signalr).
    this.signalr.on<{ tipoPantalla: string; publicidadId: number }>('PublicidadRemovida', (payload) =>
    {
      if (!payload) return;
      if (payload.tipoPantalla && payload.tipoPantalla !== this.tipoPantalla()) return;
      this.cola.update((lista) => lista.filter((p) => p.id !== payload.publicidadId));
      if (this.actual()?.id === payload.publicidadId)
      {
        // Pasa al siguiente. Si no hay, muestra mensaje.
        this.siguiente();
      }
    });

    this.signalr.on<string>('RefrescarVigentes', (tipo) =>
    {
      if (tipo && tipo !== this.tipoPantalla()) return;
      this.cargarVigentes();
    });

    this.signalr.on<unknown>('PublicidadNueva', () =>
    {
      this.cargarVigentes();
    });

    this.cargarVigentes();
  }

  ngOnDestroy(): void
  {
    this.signalr.off('PublicidadRemovida');
    this.signalr.off('RefrescarVigentes');
    this.signalr.off('PublicidadNueva');
    this.signalr.desunirDePantalla(this.tipoPantalla());
  }

  /** Recarga la lista de publicidades vigentes desde el backend. */
  private cargarVigentes(): void
  {
    this.servicioVigentes.obtenerVigentes(this.tipoPantalla()).subscribe({
      next: (lista) =>
      {
        this.cola.set(lista);
        if (lista.length === 0)
        {
          this.actual.set(null);
          this.mensaje.set('No hay publicidades vigentes para este tipo de pantalla.');
        }
        else if (!this.actual())
        {
          this.reproducir(0);
        }
      },
      error: (err) =>
      {
        console.error('Error cargando publicidades vigentes', err);
        this.mensaje.set('No se pudieron cargar las publicidades vigentes.');
      },
    });
  }

  /** Empieza a reproducir el elemento en la posición indicada. */
  private reproducir(indice: number): void
  {
    const lista = this.cola();
    if (lista.length === 0)
    {
      this.actual.set(null);
      this.mensaje.set('No hay publicidades vigentes para este tipo de pantalla.');
      return;
    }
    const posicion = indice % lista.length;
    const pub = lista[posicion];
    this.actual.set(pub);
    this.mensaje.set('');
    if (!isPlatformBrowser(this.platformId)) return;
    const video = this.videoRef.nativeElement;
    video.src = pub.urlVideo;
    video.muted = true;
    video.loop = false;
    video.load();
    const intento = video.play();
    if (intento && typeof intento.then === 'function')
    {
      intento.catch(() => {/* autoplay puede fallar si no hay interacción */});
    }
  }

  /** Avanza al siguiente video de la cola. */
  protected siguiente(): void
  {
    const lista = this.cola();
    if (lista.length === 0)
    {
      this.actual.set(null);
      return;
    }
    const idx = lista.findIndex((p) => p.id === this.actual()?.id);
    this.reproducir(idx >= 0 ? idx + 1 : 0);
  }

  /** Se ejecuta cuando el video actual termina. */
  protected onVideoEnded(): void
  {
    this.siguiente();
  }

  /** Pasa a pantalla completa. */
  protected pantallaCompleta(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    const elem = document.documentElement;
    if (document.fullscreenElement)
    {
      document.exitFullscreen().catch(() => undefined);
    }
    else if (elem.requestFullscreen)
    {
      elem.requestFullscreen().catch(() => undefined);
    }
  }

  /** Permite al usuario iniciar el reproductor si el autoplay fue bloqueado. */
  protected iniciarManual(): void
  {
    const video = this.videoRef?.nativeElement;
    if (video)
    {
      video.muted = true;
      video.play().catch(() => undefined);
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onTecla(event: KeyboardEvent): void
  {
    if (event.key === 'f' || event.key === 'F')
    {
      this.pantallaCompleta();
    }
  }
}
