import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { PublicidadVigente, TipoPantallaPublicidad } from '../shared/models/modelo-publicidad-vigente';
import { ServicioPublicidadesVigentes } from '../services/servicio-publicidades-vigentes';
import { ServicioPantallasSignalR } from '../services/servicio-pantallas-signalr';

/**
 * Reproductor a pantalla completa pensado para TVs, monitores externos
 * o portátiles. Reproduce en bucle infinito todas las publicidades
 * vigentes del tipo de pantalla indicado en la URL.
 *
 *  - Inicia solo después de que el usuario presione "Iniciar reproducción"
 *    (los navegadores bloquean el autoplay sin interacción previa).
 *  - Cuando un video termina, salta al siguiente y al acabar la cola
 *    vuelve a empezar desde el primero (bucle infinito).
 *  - Al entrar a pantalla completa se ocultan el header y los botones;
 *    para salir basta con presionar Esc (comportamiento nativo) o
 *    la tecla F / Backspace.
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
  @ViewChild('video', { static: false })
  private videoRef?: ElementRef<HTMLVideoElement>;

  private readonly ruta = inject(ActivatedRoute);
  private readonly servicioVigentes = inject(ServicioPublicidadesVigentes);
  private readonly signalr = inject(ServicioPantallasSignalR);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly subscripciones = new Subscription();
  private listenerFullscreenChange?: () => void;

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
  /** Indica si la reproducción está activa (true tras pulsar "Iniciar"). */
  protected readonly reproduciendo = signal<boolean>(false);
  /** Indica si estamos actualmente en modo pantalla completa. */
  protected readonly enPantallaCompleta = signal<boolean>(false);

  async ngOnInit(): Promise<void>
  {
    const tipo = (this.ruta.snapshot.paramMap.get('tipoPantalla') ?? this.ruta.snapshot.queryParamMap.get('tipo') ?? 'VerticalSamsung') as TipoPantallaPublicidad;
    this.tipoPantalla.set(tipo);

    // afterNextRender garantiza que la vista ya esté lista en el cliente
    // y evita intentar reproducir audio/video durante el SSR.
    afterNextRender(async () =>
    {
      if (isPlatformBrowser(this.platformId))
      {
        // Marca la página como "modo reproductor" para que el CSS global
        // oculte la scrollbar y fuerce el viewport completo.
        document.documentElement.classList.add('app-reproductor-pantalla');
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100%';
        document.documentElement.style.width = '100%';
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100%';
        document.body.style.width = '100%';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.background = '#000';

        // Listener del cambio de estado de pantalla completa (Esc, F11, etc.).
        this.listenerFullscreenChange = () =>
        {
          const activo = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
          this.enPantallaCompleta.set(activo);
        };
        document.addEventListener('fullscreenchange', this.listenerFullscreenChange);
      }

      // Suscribirse al grupo del hub correspondiente a este tipo de pantalla.
      try { await this.signalr.unirAPantalla(this.tipoPantalla()); } catch { /* sin acciones */ }

      // Listeners del hub.
      this.subscripciones.add(
        this.signalr.publicidadRemovida$.subscribe((payload) =>
        {
          if (!payload) return;
          if (payload.tipoPantalla && payload.tipoPantalla !== this.tipoPantalla()) return;
          this.cola.update((lista) => lista.filter((p) => p.id !== payload.publicidadId));
          if (this.actual()?.id === payload.publicidadId)
          {
            this.siguiente();
          }
        })
      );

      this.subscripciones.add(
        this.signalr.refrescarVigentes$.subscribe((tipo) =>
        {
          if (tipo && tipo !== this.tipoPantalla()) return;
          this.cargarVigentes();
        })
      );

      this.subscripciones.add(
        this.signalr.publicidadNueva$.subscribe(() =>
        {
          this.cargarVigentes();
        })
      );

      this.cargarVigentes();
    });
  }

  ngOnDestroy(): void
  {
    this.subscripciones.unsubscribe();
    if (isPlatformBrowser(this.platformId))
    {
      this.signalr.desunirDePantalla(this.tipoPantalla());
      if (this.listenerFullscreenChange)
      {
        document.removeEventListener('fullscreenchange', this.listenerFullscreenChange);
      }
      // Restaurar scroll/overflow del body y html.
      document.documentElement.classList.remove('app-reproductor-pantalla');
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
      document.documentElement.style.width = '';
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.width = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.background = '';
    }
  }

  /** Recarga la lista de publicidades vigentes desde el backend. */
  private cargarVigentes(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    this.servicioVigentes.obtenerVigentes(this.tipoPantalla()).subscribe({
      next: (lista) =>
      {
        // Mantener la cola actualizada pero conservando el actual si existe.
        const anterior = this.actual();
        this.cola.set(lista);
        if (lista.length === 0)
        {
          this.actual.set(null);
          this.mensaje.set('No hay publicidades vigentes para este tipo de pantalla.');
          return;
        }
        if (!anterior || !lista.some((p) => p.id === anterior.id))
        {
          if (this.reproduciendo()) this.reproducir(0);
          else
            this.mensaje.set(
              `Hay ${lista.length} publicidades vigentes. Pulsa "Iniciar reproducción" para verlas.`
            );
        }
      },
      error: (err) =>
      {
        console.error('Error cargando publicidades vigentes', err);
        this.mensaje.set(
          'No se pudieron cargar las publicidades. Revisa la conexión con el backend (puerto 5181).'
        );
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
    const posicion = ((indice % lista.length) + lista.length) % lista.length;
    const pub = lista[posicion];
    this.actual.set(pub);
    this.mensaje.set('');
    if (!isPlatformBrowser(this.platformId)) return;

    // Intentamos obtener el elemento de video de forma asíncrona tras
    // el siguiente render: usar `static: true` causaba problemas porque
    // el `<video>` se creaba dentro de un `*ngIf` y no estaba disponible
    // en el primer ciclo de detección de cambios.
    requestAnimationFrame(() => this.cargarVideoActual(pub));
  }

  /** Asigna el src al elemento <video> y dispara la reproducción. */
  private cargarVideoActual(pub: PublicidadVigente): void
  {
    const video = this.videoRef?.nativeElement;
    if (!video) return;
    video.src = pub.urlVideo;
    video.muted = true;
    video.loop = false;
    video.playsInline = true;
    video.load();
    const intento = video.play();
    if (intento && typeof intento.then === 'function')
    {
      intento
        .then(() =>
        {
          console.info('[Reproductor] Reproduciendo:', pub.nombrePublicidad, pub.urlVideo);
        })
        .catch((err) =>
        {
          console.warn('[Reproductor] No se pudo reproducir automáticamente:', err);
          this.mensaje.set(
            'El navegador bloqueó la reproducción. Vuelve a pulsar "Iniciar reproducción".'
          );
        });
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
    if (!this.reproduciendo()) return;
    this.siguiente();
  }

  /**
   * Inicia el bucle de reproducción. Se ejecuta tras un clic
   * del usuario (requisito de los navegadores para permitir
   * reproducir audio/video).
   */
  protected iniciarReproduccion(): void
  {
    this.reproduciendo.set(true);
    const lista = this.cola();
    if (lista.length === 0)
    {
      this.mensaje.set('Aún no hay publicidades vigentes. Recargando lista…');
      this.cargarVigentes();
      // Reintentamos la carga y, cuando llegue, arrancamos.
      this.servicioVigentes.obtenerVigentes(this.tipoPantalla()).subscribe({
        next: (nuevaLista) =>
        {
          if (nuevaLista.length === 0) return;
          this.cola.set(nuevaLista);
          this.reproducir(0);
        },
      });
      return;
    }
    this.reproducir(0);
  }

  /** Pasa a pantalla completa. */
  protected pantallaCompleta(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    const elem: any = document.documentElement;
    if (document.fullscreenElement || (document as any).webkitFullscreenElement)
    {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => undefined);
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    }
    else if (elem.requestFullscreen)
    {
      elem.requestFullscreen().catch(() => undefined);
    }
    else if (elem.webkitRequestFullscreen)
    {
      elem.webkitRequestFullscreen();
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onTecla(event: KeyboardEvent): void
  {
    if (event.key === 'f' || event.key === 'F')
    {
      this.pantallaCompleta();
    }
    // Esc lo maneja el navegador nativamente.
  }
}
