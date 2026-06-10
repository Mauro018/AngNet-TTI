import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import { PublicidadVigente, TipoPantallaPublicidad } from '../shared/models/modelo-publicidad-vigente';
import { ServicioPublicidadesVigentes } from '../services/servicio-publicidades-vigentes';
import { ServicioPantallasSignalR } from '../services/servicio-pantallas-signalr';

/**
 * Vista previa en vivo que muestra, dentro del dashboard, los videos
 * que se están reproduciendo (o que se reproducirían) en cada tipo de
 * pantalla. Se actualiza en tiempo real cuando se crean, eliminan o
 * vencen publicidades.
 */
@Component({
  selector: 'app-vista-previa-en-vivo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vista-previa.component.html',
  styleUrls: ['./vista-previa.component.css'],
})
export class VistaPreviaEnVivoComponent implements OnInit, OnDestroy
{
  @ViewChild('reproductorActual', { static: false })
  private reproductorRef?: ElementRef<HTMLVideoElement>;

  private readonly servicioVigentes = inject(ServicioPublicidadesVigentes);
  private readonly signalr = inject(ServicioPantallasSignalR);
  private readonly platformId = inject(PLATFORM_ID);

  /** Tipos de pantalla disponibles. */
  protected readonly tiposPantalla: TipoPantallaPublicidad[] = [
    'VerticalSamsung',
    'HorizontalDescenso',
  ];

  /** Tipo de pantalla que el usuario está previsualizando. */
  protected readonly tipoSeleccionado = signal<TipoPantallaPublicidad>('VerticalSamsung');

  /** Publicidades vigentes del tipo seleccionado. */
  protected readonly publicidades = signal<PublicidadVigente[]>([]);
  /** Cola rotativa con todas las publicidades. */
  protected readonly cola = signal<PublicidadVigente[]>([]);
  /** Publicidad actualmente visible en el reproductor. */
  protected readonly actual = signal<PublicidadVigente | null>(null);
  /** Mensaje para cuando no hay vigentes. */
  protected readonly mensaje = signal<string>('Conectando con el servidor…');
  /** Indica si el usuario ya dio play manual. */
  protected readonly reproduciendo = signal<boolean>(false);
  /** Indica si el navegador bloqueó el autoplay. */
  protected readonly requiereInteraccion = signal<boolean>(false);

  private intervaloRotacion?: number;
  private listenersRegistrados = false;

  async ngOnInit(): Promise<void>
  {
    // Se suscribe a AMBOS grupos del hub para mantenerse al día con cualquier cambio.
    for (const tipo of this.tiposPantalla)
    {
      try { await this.signalr.unirAPantalla(tipo); } catch { /* sin acciones */ }
    }
    this.registrarListeners();
    this.cargar();
  }

  ngOnDestroy(): void
  {
    if (this.intervaloRotacion)
    {
      clearInterval(this.intervaloRotacion);
    }
    this.signalr.off('PublicidadRemovida');
    this.signalr.off('RefrescarVigentes');
    this.signalr.off('PublicidadNueva');
    for (const tipo of this.tiposPantalla)
    {
      this.signalr.desunirDePantalla(tipo);
    }
  }

  protected seleccionarTipo(tipo: TipoPantallaPublicidad): void
  {
    this.tipoSeleccionado.set(tipo);
    this.cargar();
  }

  /** Inicia o reanuda la reproducción. */
  protected iniciar(): void
  {
    this.reproduciendo.set(true);
    this.requiereInteraccion.set(false);
    if (this.intervaloRotacion) clearInterval(this.intervaloRotacion);
    this.siguiente();
    this.intervaloRotacion = window.setInterval(() => this.siguiente(), 15000);
  }

  /** Pausa la rotación automática. */
  protected pausar(): void
  {
    this.reproduciendo.set(false);
    if (this.intervaloRotacion)
    {
      clearInterval(this.intervaloRotacion);
      this.intervaloRotacion = undefined;
    }
    const video = this.reproductorRef?.nativeElement;
    if (video) video.pause();
  }

  /** Pasa al siguiente video. */
  protected siguiente(): void
  {
    const cola = this.cola();
    if (cola.length === 0)
    {
      this.actual.set(null);
      this.mensaje.set('No hay publicidades vigentes para este tipo de pantalla.');
      return;
    }
    const idx = cola.findIndex((p) => p.id === this.actual()?.id);
    const siguienteIdx = idx >= 0 ? (idx + 1) % cola.length : 0;
    const pub = cola[siguienteIdx];
    this.actual.set(pub);
    this.mensaje.set('');
    this.reproducirVideo(pub);
  }

  private reproducirVideo(pub: PublicidadVigente): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    const video = this.reproductorRef?.nativeElement;
    if (!video) return;
    video.src = pub.urlVideo;
    video.muted = true;
    video.load();
    const intento = video.play();
    if (intento && typeof intento.then === 'function')
    {
      intento.catch(() => this.requiereInteraccion.set(true));
    }
  }

  private registrarListeners(): void
  {
    if (this.listenersRegistrados) return;
    this.listenersRegistrados = true;

    this.signalr.on<{ tipoPantalla: string; publicidadId: number }>('PublicidadRemovida', (payload) =>
    {
      if (!payload) return;
      this.cola.update((lista) => lista.filter((p) => p.id !== payload.publicidadId));
      this.publicidades.update((lista) => lista.filter((p) => p.id !== payload.publicidadId));
      if (this.actual()?.id === payload.publicidadId)
      {
        this.siguiente();
      }
    });

    this.signalr.on<string>('RefrescarVigentes', () =>
    {
      this.cargar();
    });

    this.signalr.on<unknown>('PublicidadNueva', () =>
    {
      this.cargar();
    });
  }

  private cargar(): void
  {
    this.servicioVigentes.obtenerVigentes(this.tipoSeleccionado()).subscribe({
      next: (lista) =>
      {
        this.publicidades.set(lista);
        this.cola.set(lista);
        if (lista.length === 0)
        {
          this.actual.set(null);
          this.mensaje.set('No hay publicidades vigentes para este tipo de pantalla.');
          return;
        }
        if (!this.actual())
        {
          this.actual.set(lista[0]);
        }
        if (this.reproduciendo())
        {
          this.reproducirVideo(lista[0]);
        }
      },
      error: (err) =>
      {
        console.error('Error cargando publicidades vigentes', err);
        this.mensaje.set('No se pudieron cargar las publicidades vigentes.');
      },
    });
  }
}
