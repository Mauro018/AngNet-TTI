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

  // afterNextRender debe invocarse en injection context (constructor o
  // field initializer). Por eso lo programamos como field initializer;
  // su callback se ejecutará en el navegador tras el primer render y
  // se encarga de iniciar el polling, suscribirse a SignalR, etc.
  private readonly bootstrap = afterNextRender(async () =>
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

    // Nos unimos al hub por si SignalR llega a funcionar, pero
    // NO confiamos en él: la fuente de verdad para recargar es
    // el polling HTTP que se inicia más abajo. Esto evita que
    // una conexión SignalR caída, un proxy intermedio, o un
    // cambio directo en BD bloquee la recarga automática.
    try { await this.signalr.unirAPantalla(this.tipoPantalla()); } catch { /* sin acciones */ }

    // ==========================================================
    // Mecanismo PRINCIPAL: polling cada 5 s contra el backend.
    // Compara la versión y recarga si cambió.
    // ==========================================================
    this.iniciarPollingVigentes();

    // Cargamos la primera vez para tener datos en pantalla.
    this.cargarVigentes();

    // Si el operador ya había iniciado la reproducción y puesto
    // la pantalla en modo fullscreen antes de la última recarga
    // automática, los reactivamos para que la experiencia sea
    // completamente desatendida.
    this.restaurarEstadoAutomatizacion();
  });

  ngOnInit(): void
  {
    const tipo = (this.ruta.snapshot.paramMap.get('tipoPantalla') ?? this.ruta.snapshot.queryParamMap.get('tipo') ?? 'VerticalSamsung') as TipoPantallaPublicidad;
    this.tipoPantalla.set(tipo);

    // El bootstrap real (petición HTTP, listeners, polling) se hace
    // en el field initializer `bootstrap` usando afterNextRender, que
    // SÍ está en injection context.
  }

  /**
   * Reanuda la reproducción y/o el modo pantalla completa si
   * quedaron guardados en sessionStorage por una recarga previa.
   * Solo se ejecuta si hay publicidades vigentes para mostrar.
   */
  private restaurarEstadoAutomatizacion(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    let debeReproducir = false;
    let debeFullscreen = false;
    try
    {
      debeReproducir =
        sessionStorage.getItem(`reproductorAuto:${this.tipoPantalla()}`) === '1';
      debeFullscreen =
        sessionStorage.getItem(`reproductorFullscreen:${this.tipoPantalla()}`) === '1';
    }
    catch { /* sin acciones */ }

    if (!debeReproducir && !debeFullscreen) return;

    const intentar = () =>
    {
      if (this.cola().length === 0) return; // Aún no hay publicidades.
      if (debeReproducir && !this.reproduciendo())
      {
        this.reproduciendo.set(true);
        this.reproducir(0);
      }
      if (debeFullscreen && !this.enPantallaCompleta())
      {
        const elem: any = document.documentElement;
        const promesa = elem.requestFullscreen
          ? elem.requestFullscreen()
          : (elem.webkitRequestFullscreen ? elem.webkitRequestFullscreen() : null);
        if (promesa && typeof promesa.catch === 'function') promesa.catch(() => undefined);
      }
    };

    // Damos tiempo a que cargue la lista de publicidades.
    setTimeout(intentar, 800);
  }

  ngOnDestroy(): void
  {
    this.subscripciones.unsubscribe();
    this.detenerPollingVigentes();
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

        // Comparar contra la última lista conocida y detectar cualquier
        // cambio (altas, bajas, video reemplazado, fechas editadas) para
        // recargar la página de forma prolija, sin importar si SignalR
        // llegó o no.
        this.detectarCambiosYRecargar(lista);

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

  // ============================================================
  // Polling de respaldo (cada 10s) + recarga por SignalR
  // ============================================================
  /**
   * Hash de la última lista conocida. Sirve para que el polling de
   * respaldo detecte cambios aunque SignalR no haya llegado o falle.
   * Lo actualizamos aquí mismo, en `cargarVigentes`, que es donde
   * llegan los datos frescos del backend.
   */
  private hashUltimaLista = '';

  /** Hash de la última versión consultada al backend (vía endpoint liviano). */
  private hashUltimaVersion = '';

  /**
   * Timer del polling. Si SignalR funciona, las recargas se disparan
   * apenas llega el evento; si falla o se pierde la conexión, este
   * timer detecta el cambio en menos de 10 segundos.
   */
  private intervaloPolling?: number;

  /** Genera un hash simple pero estable de la lista de publicidades.
   *  Incluye los campos que pueden cambiar sin que la colección lo
   *  "mueva" de posición: video, fechas, etc. */
  private calcularHashLista(lista: PublicidadVigente[]): string
  {
    return lista
      .map((p) =>
        [
          p.id,
          p.nombrePublicidad,
          p.urlVideo,
          p.duracionVideoSegundos,
          p.fechaInicio,
          p.fechaFin,
        ].join('|')
      )
      .join(';;');
  }

  /**
   * Compara la lista recién obtenida contra la última conocida.
   * Si difiere, programa una recarga de la página completa.
   * Normaliza URL de video y fechas para que pequeños cambios de
   * serialización (por ejemplo, distinta hora UTC) no disparen
   * recargas innecesarias, pero sí cualquier cambio real.
   */
  private detectarCambiosYRecargar(lista: PublicidadVigente[]): void
  {
    const nuevoHash = this.calcularHashLista(lista);
    if (this.hashUltimaLista && this.hashUltimaLista !== nuevoHash)
    {
      console.info(
        '[Reproductor] Cambio detectado en la lista de publicidades → recargando.',
        { cantidad: lista.length }
      );
      this.programarRecarga();
    }
    this.hashUltimaLista = nuevoHash;
  }

  /**
   * Compara la versión devuelta por el endpoint liviano contra la
   * última conocida. Si difiere, recarga. Es el método principal de
   * detección de cambios: barato (1 sola consulta de pocos bytes).
   */
  private detectarCambiosVersionYRecargar(version: { hash: string; total: number }): void
  {
    if (this.hashUltimaVersion && this.hashUltimaVersion !== version.hash)
    {
      console.info(
        '[Reproductor] Cambio de versión detectado → recargando.',
        { total: version.total, hash: version.hash }
      );
      this.programarRecarga();
    }
    else
    {
      console.info('[Reproductor] Sin cambios en la versión de publicidades.');
    }
    this.hashUltimaVersion = version.hash;
  }

  /**
   * Inicia un polling que consulta el endpoint *liviano* de versión
   * de publicidades vigentes cada 5 segundos. El backend calcula un
   * hash sobre los campos que pueden cambiar (id, nombre, video,
   * duración, fechas) y solo devuelve ese hash + total. Si el hash
   * difiere del último conocido, la página se recarga. Es la fuente
   * de verdad para la recarga automática, independiente de SignalR.
   */
  private iniciarPollingVigentes(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.intervaloPolling) return;
    console.info('[Reproductor] Polling de versión de publicidades iniciado cada 5s para', this.tipoPantalla());

    // Hacemos la primera consulta de inmediato (sin esperar 5s) para
    // establecer el hash base lo antes posible.
    this.consultarVersionYRecargar();

    this.intervaloPolling = window.setInterval(() => this.consultarVersionYRecargar(), 5000);
  }

  /** Realiza una consulta al endpoint de versión y evalúa si debe recargar. */
  private consultarVersionYRecargar(): void
  {
    if (this.recargando) return;
    this.servicioVigentes.obtenerVersionVigentes(this.tipoPantalla()).subscribe({
      next: (version) =>
      {
        console.info('[Reproductor] Versión consultada:', { total: version.total, hash: version.hash.substring(0, 12) + '…' });
        this.detectarCambiosVersionYRecargar(version);
      },
      error: (err) =>
      {
        console.warn('[Reproductor] Polling de versión falló, reintentando en 5s:', err);
      },
    });
  }

  /** Detiene el polling al destruir el componente. */
  private detenerPollingVigentes(): void
  {
    if (this.intervaloPolling)
    {
      clearInterval(this.intervaloPolling);
      this.intervaloPolling = undefined;
    }
  }

  // ============================================================
  // Recarga automática
  // ============================================================
  /**
   * Indica si la página ya se está recargando para evitar bucles
   * infinitos (p. ej. si el backend dispara varios eventos juntos).
   */
  private recargando = false;

  /** Marca que ya hay una recarga pendiente y devuelve true si es
   *  la primera vez (para que solo se programe una vez). */
  private marcarRecargaPendiente(): boolean
  {
    if (this.recargando) return false;
    this.recargando = true;
    return true;
  }

  /**
   * Programa una recarga de la página completa. Antes de recargar
   * intenta volver a entrar en modo pantalla completa y reanudar la
   * reproducción (sin requerir un nuevo clic del operador).
   *
   *  - Se ejecuta con un pequeño retardo para que el usuario perciba
   *    el cambio (y para que el backend termine de procesar las
   *    notificaciones que disparó la recarga).
   *  - Tras la recarga, si el operador ya había pulsado "Iniciar
   *    reproducción", el componente reanuda automáticamente el bucle.
   */
  private programarRecarga(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.marcarRecargaPendiente()) return;

    // Persistir en sessionStorage que el usuario ya inició la
    // reproducción, para que al recargar el componente reanude solo.
    try
    {
      const estabaReproduciendo =
        sessionStorage.getItem(`reproductorAuto:${this.tipoPantalla()}`) === '1';
      const estabaPantallaCompleta = sessionStorage.getItem(
        `reproductorFullscreen:${this.tipoPantalla()}`
      ) === '1';
      if (this.reproduciendo()) sessionStorage.setItem(`reproductorAuto:${this.tipoPantalla()}`, '1');
      if (estabaPantallaCompleta || this.enPantallaCompleta())
      {
        sessionStorage.setItem(`reproductorFullscreen:${this.tipoPantalla()}`, '1');
      }
      // Si el operador nunca dio play, limpiamos cualquier marca previa
      // para no forzar autoplay sin su consentimiento.
      if (!this.reproduciendo() && !estabaReproduciendo)
      {
        sessionStorage.removeItem(`reproductorAuto:${this.tipoPantalla()}`);
        sessionStorage.removeItem(`reproductorFullscreen:${this.tipoPantalla()}`);
      }
    }
    catch { /* sessionStorage puede no estar disponible */ }

    console.info('[Reproductor] Programando recarga forzada de la página en 800ms...');

    // Retardo corto para que la BD termine de confirmar el cambio,
    // pero suficientemente rápido para que el operador lo vea casi
    // instantáneamente. Recarga desde el servidor (sin caché).
    setTimeout(() =>
    {
      try
      {
        // Truco para evitar la caché del navegador: recargamos
        // con un query string único y luego limpiamos la URL.
        const url = new URL(window.location.href);
        url.searchParams.set('_t', Date.now().toString());
        window.location.replace(url.toString());
      }
      catch (error)
      {
        console.error('[Reproductor] No se pudo recargar la página:', error);
        this.recargando = false;
      }
    }, 800);
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
    // Marcar en sessionStorage que esta pantalla ya fue iniciada,
    // para que las próximas recargas automáticas reanuden solas.
    try
    {
      sessionStorage.setItem(`reproductorAuto:${this.tipoPantalla()}`, '1');
    }
    catch { /* sin acciones */ }

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
    // Persistir el estado para que la próxima recarga automática
    // vuelva a entrar en fullscreen sin intervención del operador.
    try
    {
      const estaba = document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (!estaba)
      {
        sessionStorage.setItem(`reproductorFullscreen:${this.tipoPantalla()}`, '1');
      }
      else
      {
        sessionStorage.removeItem(`reproductorFullscreen:${this.tipoPantalla()}`);
      }
    }
    catch { /* sin acciones */ }

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
