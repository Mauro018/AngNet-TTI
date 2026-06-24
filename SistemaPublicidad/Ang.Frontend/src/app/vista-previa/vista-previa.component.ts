import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { PublicidadVigente, TipoPantallaPublicidad } from '../shared/models/modelo-publicidad-vigente';
import { ServicioPublicidadesVigentes, VersionVigentes } from '../services/servicio-publicidades-vigentes';
import { ServicioPantallasSignalR } from '../services/servicio-pantallas-signalr';
import { Subscription } from 'rxjs';

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
  private readonly subscripciones = new Subscription();

  /**
   * Hash de la última versión consultada al backend (vía endpoint
   * liviano). Se compara cada 5s para detectar cambios aunque SignalR
   * no haya llegado o esté fallando.
   */
  private hashUltimaVersion = '';
  /** Timer del polling de respaldo (cada 5s). */
  private intervaloPolling?: number;
  /** Evita lanzar varias recargas simultáneas. */
  private recargando = false;

  // afterNextRender debe invocarse en injection context (constructor o
  // field initializer). Lo registramos como field initializer para que
  // el bootstrap se ejecute en el navegador tras el primer render.
  private readonly bootstrap = afterNextRender(async () =>
  {
    // Se suscribe a AMBOS grupos del hub para mantenerse al día con cualquier cambio.
    for (const tipo of this.tiposPantalla)
    {
      try { await this.signalr.unirAPantalla(tipo); } catch { /* sin acciones */ }
    }
    this.registrarListeners();
    this.cargar();
    this.iniciarPollingVersion();
  });

  ngOnInit(): void
  {
    // El bootstrap real se hace en el field initializer `bootstrap`.
  }

  ngOnDestroy(): void
  {
    if (this.intervaloRotacion)
    {
      clearInterval(this.intervaloRotacion);
    }
    this.detenerPollingVersion();
    this.subscripciones.unsubscribe();
    if (isPlatformBrowser(this.platformId))
    {
      for (const tipo of this.tiposPantalla)
      {
        this.signalr.desunirDePantalla(tipo);
      }
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
    this.subscripciones.add(
      this.signalr.publicidadRemovida$.subscribe((payload) =>
      {
        if (!payload) return;
        this.cola.update((lista) => lista.filter((p) => p.id !== payload.publicidadId));
        this.publicidades.update((lista) => lista.filter((p) => p.id !== payload.publicidadId));
        if (this.actual()?.id === payload.publicidadId)
        {
          this.siguiente();
        }
      })
    );

    this.subscripciones.add(
      this.signalr.refrescarVigentes$.subscribe(() => this.cargar())
    );

    this.subscripciones.add(
      this.signalr.publicidadNueva$.subscribe(() => this.cargar())
    );
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

  // ============================================================
  // Polling de respaldo (cada 5s) → recarga si cambia el hash
  // ============================================================

  /**
   * Polling independiente de SignalR. Cada 5s consulta al endpoint
   * liviano `version-vigentes`. Si el hash difiere del último conocido
   * significa que la lista cambió (alta, baja, video reemplazado,
   * fechas editadas) y recarga la página automáticamente.
   */
  private iniciarPollingVersion(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.intervaloPolling) return;
    console.info('[VistaPrevia] Polling de versión iniciado cada 5s para', this.tipoSeleccionado());

    // Primera consulta inmediata para fijar el hash base.
    this.consultarVersion();

    this.intervaloPolling = window.setInterval(() => this.consultarVersion(), 5000);
  }

  private consultarVersion(): void
  {
    if (this.recargando) return;
    this.servicioVigentes.obtenerVersionVigentes(this.tipoSeleccionado()).subscribe({
      next: (version) =>
      {
        console.info('[VistaPrevia] Versión consultada:', { total: version.total, hash: version.hash.substring(0, 12) + '…' });
        this.detectarCambiosVersion(version);
      },
      error: (err) => console.warn('[VistaPrevia] Polling de versión falló, reintentando en 5s:', err),
    });
  }

  /** Detiene el polling. */
  private detenerPollingVersion(): void
  {
    if (this.intervaloPolling)
    {
      clearInterval(this.intervaloPolling);
      this.intervaloPolling = undefined;
    }
  }

  /**
   * Compara el hash devuelto por el backend contra el último conocido.
   * Si difiere, recarga la página.
   */
  private detectarCambiosVersion(version: VersionVigentes): void
  {
    if (this.hashUltimaVersion && this.hashUltimaVersion !== version.hash)
    {
      console.info('[VistaPrevia] Cambio de versión detectado → recargando.', { total: version.total });
      this.programarRecarga();
    }
    else
    {
      console.info('[VistaPrevia] Sin cambios en la versión de publicidades.');
    }
    this.hashUltimaVersion = version.hash;
  }

  /** Programa una recarga con un pequeño retardo. */
  private programarRecarga(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.recargando) return;
    this.recargando = true;
    console.info('[VistaPrevia] Programando recarga forzada de la página en 800ms...');
    setTimeout(() =>
    {
      try
      {
        // Recarga evitando caché del navegador.
        const url = new URL(window.location.href);
        url.searchParams.set('_t', Date.now().toString());
        window.location.replace(url.toString());
      }
      catch (error)
      {
        console.error('[VistaPrevia] No se pudo recargar la página:', error);
        this.recargando = false;
      }
    }, 800);
  }
}
