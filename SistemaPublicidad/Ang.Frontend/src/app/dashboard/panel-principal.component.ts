// Panel principal que organiza el inicio, la gestión de empresas y la gestión de publicidades.
import { PLATFORM_ID } from '@angular/core';
import { Component, OnDestroy, OnInit, afterNextRender, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Empresa, Publicidad, SectorIndustriaEmpresa, TarjetaEstado, TarjetaMetrica } from '../shared/models/modelo-publicidad';
import { EmpresaService } from '../services/empresa';
import { EditarPublicidadEntrada, NuevaPublicidadEntrada, PublicidadService } from '../services/publicidad';
import { ServicioPublicidadesVigentes, VersionGlobal } from '../services/servicio-publicidades-vigentes';
import { HeroeComponent } from './heroe.component';
import { Navbar, SeccionNavegacion } from './navbar.component';
import { FormularioEmpresaComponent } from './formulario-empresa.component';
import { ListaEmpresasComponent } from './lista-empresas.component';
import { FormularioPublicidadComponent } from './formulario-publicidad.component';
import { ListaPublicidadesComponent } from './lista-publicidades.component';
import { VistaPreviaEnVivoComponent } from '../vista-previa/vista-previa.component';
import { PanelPantallasComponent } from './panel-pantallas.component';

@Component({
  selector: 'app-panel-principal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Navbar,
    HeroeComponent,
    FormularioEmpresaComponent,
    ListaEmpresasComponent,
    FormularioPublicidadComponent,
    ListaPublicidadesComponent,
    VistaPreviaEnVivoComponent,
    PanelPantallasComponent,
  ],
  templateUrl: './panel-principal.component.html',
  styleUrls: ['./panel-principal.component.css'],
})
export class PanelPrincipalComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly servicioVigentes = inject(ServicioPublicidadesVigentes);

  // Estado reactivo cargado desde la API para que los formularios persistan realmente en la base de datos.
  protected empresasRegistradas = signal<Empresa[]>([]);
  protected publicidadesRegistradas = signal<Publicidad[]>([]);
  protected empresaErrorMessage = signal('');
  protected publicidadErrorMessage = signal('');
  protected empresaEditando = signal<Empresa | null>(null);
  protected publicidadEditando = signal<Publicidad | null>(null);

  /**
   * Hash de la última versión consultada al backend (vía endpoint
   * liviano). Se compara cada 5s para detectar cambios (altas, bajas,
   * video reemplazado, fechas editadas) y recargar la lista general
   * de publicidades sin que el usuario tenga que refrescar la página.
   */
  private hashUltimaVersion = '';
  private intervaloPolling?: number;

  protected readonly todayLabel = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  protected readonly tituloHeroe = 'Administración rápida de publicidades para el terminal.';

  protected readonly descripcionHeroe =
    'Aquí encuentras un resumen claro del sistema, las cifras más importantes y el estado general de las publicidades activas.';

  protected readonly textoPiePagina =
    'Terminal de Transporte de Ibagué. Panel administrativo interno para control de publicidades y vigencias.';

  constructor(
    private readonly empresaService: EmpresaService,
    private readonly publicidadService: PublicidadService,
  ) {
    // Cargamos empresas/publicidades solo en el navegador, dentro de
    // afterNextRender. Así evitamos que durante el SSR (que corre en Node)
    // se disparen peticiones HTTP hacia la IP de la LAN, las cuales se
    // cuelgan y hacen que Angular muestre el warning
    // "Application did not stabilize within 9 seconds".
    afterNextRender(() => {
      this.cargarEmpresas();
      this.cargarPublicidades();
      this.iniciarPollingVersion();
    });
  }

  ngOnInit(): void {
    // ngOnInit se sigue ejecutando también en SSR. Lo dejamos vacío a
    // propósito: las llamadas HTTP se difieren a afterNextRender (browser).
  }

  ngOnDestroy(): void {
    this.detenerPollingVersion();
  }

  // ============================================================
  // Polling de respaldo (cada 5s) → recarga la lista si cambia
  // ============================================================

  /**
   * Polling que consulta cada 5s el endpoint liviano de versión.
   * Si el hash difiere del último conocido, recarga la lista
   * general de publicidades. Independiente de SignalR.
   */
  private iniciarPollingVersion(): void
  {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.intervaloPolling) return;
    this.intervaloPolling = window.setInterval(() =>
    {
      // Hash GLOBAL de TODAS las publicidades (no solo vigentes):
      // cubre altas, bajas, ediciones y reemplazos de video.
      this.servicioVigentes.obtenerVersionGlobal().subscribe({
        next: (version) => this.detectarCambiosVersion(version),
        error: (err) => console.warn('[PanelPrincipal] Polling de versión falló, reintentando en 5s:', err),
      });
    }, 5000);
  }

  private detenerPollingVersion(): void
  {
    if (this.intervaloPolling)
    {
      clearInterval(this.intervaloPolling);
      this.intervaloPolling = undefined;
    }
  }

  private detectarCambiosVersion(version: VersionGlobal): void
  {
    if (this.hashUltimaVersion && this.hashUltimaVersion !== version.hash)
    {
      console.info('[PanelPrincipal] Cambio detectado en publicidades → recargando lista.', { total: version.total });
      this.cargarPublicidades();
    }
    this.hashUltimaVersion = version.hash;
  }

  // ─── Estado de paginación para las tablas pequeñas del inicio ───
  protected paginaEmpresasConPublicidades = signal(1);
  protected paginaEmpresasInactivas = signal(1);
  protected paginaPublicidadesVencidas = signal(1);
  protected readonly elementosPorPagina = 5;

  // ─── Filtros de publicidades vencidas ───
  protected anioFiltroPublicidadesVencidas = signal('');
  protected mesFiltroPublicidadesVencidas = signal('');

  protected readonly nombresMeses = [
    { valor: '1', nombre: 'Enero' },
    { valor: '2', nombre: 'Febrero' },
    { valor: '3', nombre: 'Marzo' },
    { valor: '4', nombre: 'Abril' },
    { valor: '5', nombre: 'Mayo' },
    { valor: '6', nombre: 'Junio' },
    { valor: '7', nombre: 'Julio' },
    { valor: '8', nombre: 'Agosto' },
    { valor: '9', nombre: 'Septiembre' },
    { valor: '10', nombre: 'Octubre' },
    { valor: '11', nombre: 'Noviembre' },
    { valor: '12', nombre: 'Diciembre' },
  ];

  // Sección activa del panel. Cada valor coincide con una opción de navegación.
  protected seccionActiva = signal('Inicio');
  // Navegación principal del panel.
  // La alerta de Publicidades se recalcula según los vencimientos para que el aviso sea visible desde arriba.
  protected readonly seccionesNavegacion = signal<SeccionNavegacion[]>([
    { id: 'Inicio', label: 'Inicio' },
    { id: 'Empresas', label: 'Empresas' },
    { id: 'Publicidades', label: 'Publicidades', alert: this.calcularAlertaPublicidad() },
    { id: 'VistaPrevia', label: 'Vista previa' },
    { id: 'Pantallas', label: 'Pantallas' },
  ]);

  // Cambia la sección visible en la interfaz y refresca las alertas del menú.
  protected establecerSeccionActiva(sectionId: string): void {
    this.seccionActiva.set(sectionId);
    this.updateAlerts();
  }

  // ─── Estadísticas del inicio ───

  /** Total de empresas registradas. */
  protected get totalEmpresas(): number {
    return this.empresasRegistradas().length;
  }

  /** Empresas agrupadas por sector de industria. */
  protected get empresasPorSector(): { sector: string; label: string; cantidad: number }[] {
    const labels: Record<SectorIndustriaEmpresa | string, string> = {
      TRANSPORTE: 'Transporte',
      TECNOLOGIA: 'Tecnología',
      SALUD: 'Salud',
      GOBIERNO_E_INST_PUBLICAS: 'Gobierno e Inst. Públicas',
      ALIMENTOS: 'Alimentos',
      COMERCIO: 'Comercio',
      ASEO: 'Aseo',
      FINANCIERO: 'Financiero',
      OTROS: 'Otros',
    };
    const mapa = new Map<string, number>();
    for (const empresa of this.empresasRegistradas()) {
      mapa.set(empresa.sectorIndustria, (mapa.get(empresa.sectorIndustria) ?? 0) + 1);
    }
    return Array.from(mapa.entries())
      .map(([sector, cantidad]) => ({ sector, label: labels[sector] ?? sector, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  /** Datos para la gráfica de dona: vigentes, por vencer, vencidas (mutuamente excluyentes). */
  protected get datosDonaPublicidades(): { etiqueta: string; cantidad: number; color: string }[] {
    const conteo = this.contarEstadosPublicidades();
    return [
      { etiqueta: 'Vigentes', cantidad: conteo.vigentes, color: 'var(--success)' },
      { etiqueta: 'Por vencer', cantidad: conteo.porVencer, color: 'var(--warning)' },
      { etiqueta: 'Vencidas', cantidad: conteo.vencidas, color: 'var(--danger)' },
    ].filter((segmento) => segmento.cantidad > 0);
  }

  /** Leyenda completa de la dona, incluyendo categorías con cantidad cero para identificar siempre los colores. */
  protected get leyendaDonaPublicidades(): { etiqueta: string; cantidad: number; color: string; porcentaje: number }[] {
    const conteo = this.contarEstadosPublicidades();
    const porcentajes = this.calcularPorcentajesDona(conteo.vigentes, conteo.porVencer, conteo.vencidas);
    return [
      { etiqueta: 'Vigentes', cantidad: conteo.vigentes, color: 'var(--success)', porcentaje: porcentajes[0] },
      { etiqueta: 'Por vencer', cantidad: conteo.porVencer, color: 'var(--warning)', porcentaje: porcentajes[1] },
      { etiqueta: 'Vencidas', cantidad: conteo.vencidas, color: 'var(--danger)', porcentaje: porcentajes[2] },
    ];
  }

  /** Cuenta publicidades en cada estado de forma disjunta. */
  private contarEstadosPublicidades(): { vigentes: number; porVencer: number; vencidas: number } {
    const publicidades = this.publicidadesRegistradas();
    const hoy = this.normalizarFechaHoy();
    let vigentes = 0;
    let porVencer = 0;
    let vencidas = 0;

    for (const publicidad of publicidades) {
      const inicio = new Date(`${publicidad.fechaInicio}T00:00:00`);
      const fin = new Date(`${publicidad.fechaFin}T23:59:59`);
      const diasRestantes = this.calcularDiasRestantes(publicidad.fechaFin);

      if (fin < hoy) {
        vencidas++;
      } else if (inicio <= hoy && diasRestantes >= 0 && diasRestantes < 7) {
        porVencer++;
      } else if (inicio <= hoy) {
        vigentes++;
      }
      // Si aún no ha iniciado (inicio > hoy) no se cuenta en la dona de estados.
    }

    return { vigentes, porVencer, vencidas };
  }

  /** Calcula porcentajes que sumen exactamente 100 para la leyenda de la dona. */
  private calcularPorcentajesDona(vigentes: number, porVencer: number, vencidas: number): number[] {
    const total = vigentes + porVencer + vencidas;
    if (total === 0) return [0, 0, 0];

    const crudos = [
      (vigentes / total) * 100,
      (porVencer / total) * 100,
      (vencidas / total) * 100,
    ];
    const redondeados = crudos.map((p) => Math.floor(p));
    let restante = 100 - redondeados.reduce((suma, valor) => suma + valor, 0);

    const orden = crudos
      .map((p, i) => ({ indice: i, fraccion: p - Math.floor(p) }))
      .sort((a, b) => b.fraccion - a.fraccion);

    for (let i = 0; i < restante; i++) {
      redondeados[orden[i % orden.length].indice]++;
    }

    return redondeados;
  }

  /** Empresas con la cantidad de publicidades asociadas. */
  protected get empresasConConteoPublicidades(): { id: number; nombre: string; cantidad: number }[] {
    const publicidades = this.publicidadesRegistradas();
    return this.empresasRegistradas()
      .map((empresa) => ({
        id: empresa.id,
        nombre: empresa.nombre,
        cantidad: publicidades.filter((p) => p.empresaId === empresa.id).length,
      }))
      .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
  }

  /** Empresas inactivas. */
  protected get empresasInactivas(): Empresa[] {
    return this.empresasRegistradas()
      .filter((e) => e.estado === 'Inactiva')
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /** Publicidades vencidas con datos de la empresa. */
  protected get publicidadesVencidasConEmpresa(): Publicidad[] {
    return this.obtenerPublicidadesVencidas().sort(
      (a, b) => new Date(b.fechaFin).getTime() - new Date(a.fechaFin).getTime()
    );
  }

  /** Años únicos presentes en las publicidades vencidas, ordenados descendente. */
  protected get aniosDisponiblesVencidas(): number[] {
    const anios = new Set<number>();
    for (const publicidad of this.publicidadesVencidasConEmpresa) {
      anios.add(new Date(publicidad.fechaFin).getFullYear());
    }
    return Array.from(anios).sort((a, b) => b - a);
  }

  /** Publicidades vencidas filtradas por año y mes seleccionados. */
  protected get publicidadesVencidasFiltradas(): Publicidad[] {
    const anio = this.anioFiltroPublicidadesVencidas();
    const mes = this.mesFiltroPublicidadesVencidas();
    return this.publicidadesVencidasConEmpresa.filter((publicidad) => {
      const fecha = new Date(publicidad.fechaFin);
      const coincideAnio = !anio || fecha.getFullYear().toString() === anio;
      const coincideMes = !mes || (fecha.getMonth() + 1).toString() === mes;
      return coincideAnio && coincideMes;
    });
  }

  protected cambiarAnioVencidas(valor: string): void {
    this.anioFiltroPublicidadesVencidas.set(valor);
    this.resetPagina(this.paginaPublicidadesVencidas);
  }

  protected cambiarMesVencidas(valor: string): void {
    this.mesFiltroPublicidadesVencidas.set(valor);
    this.resetPagina(this.paginaPublicidadesVencidas);
  }

  protected limpiarFiltrosVencidas(): void {
    this.anioFiltroPublicidadesVencidas.set('');
    this.mesFiltroPublicidadesVencidas.set('');
    this.resetPagina(this.paginaPublicidadesVencidas);
  }

  /** Total de publicidades representadas en la dona (vigentes + por vencer + vencidas). */
  protected get totalPublicidadesDona(): number {
    return this.datosDonaPublicidades.reduce((suma, segmento) => suma + segmento.cantidad, 0);
  }

  // ─── Helpers de paginación ───

  protected paginar<T>(elementos: T[], pagina: number): T[] {
    const inicio = (pagina - 1) * this.elementosPorPagina;
    return elementos.slice(inicio, inicio + this.elementosPorPagina);
  }

  protected totalPaginas(totalElementos: number): number {
    return Math.max(1, Math.ceil(totalElementos / this.elementosPorPagina));
  }

  protected irAPagina(nuevaPagina: number, paginaActual: number, totalElementos: number, signalPagina: ReturnType<typeof signal<number>>): void {
    const total = this.totalPaginas(totalElementos);
    if (nuevaPagina >= 1 && nuevaPagina <= total) {
      signalPagina.set(nuevaPagina);
    }
  }

  protected paginaAnterior(totalElementos: number, signalPagina: ReturnType<typeof signal<number>>): void {
    this.irAPagina(signalPagina() - 1, signalPagina(), totalElementos, signalPagina);
  }

  protected paginaSiguiente(totalElementos: number, signalPagina: ReturnType<typeof signal<number>>): void {
    this.irAPagina(signalPagina() + 1, signalPagina(), totalElementos, signalPagina);
  }

  protected resetPagina(signalPagina: ReturnType<typeof signal<number>>): void {
    signalPagina.set(1);
  }

  /** Calcula el arco de cada segmento de la dona; el total de arcos + huecos cierra el círculo al 100%. */
  protected calcularArcoDona(cantidad: number): string {
    const total = this.totalPublicidadesDona;
    const circunferencia = 2 * Math.PI * 70;
    if (total === 0) return `0 ${circunferencia}`;

    const datos = this.datosDonaPublicidades;
    const hueco = datos.length > 1 ? 2 : 0;
    const arcoUtil = circunferencia - datos.length * hueco;
    const longitud = (cantidad / total) * arcoUtil;
    return `${longitud} ${circunferencia}`;
  }

  /** Calcula el desplazamiento acumulado para cada segmento de la dona. */
  protected calcularDesplazamientoDona(indice: number): number {
    const total = this.totalPublicidadesDona;
    const circunferencia = 2 * Math.PI * 70;
    if (total === 0) return circunferencia;

    const datos = this.datosDonaPublicidades;
    const hueco = datos.length > 1 ? 2 : 0;
    const arcoUtil = circunferencia - datos.length * hueco;
    let acumulado = 0;
    for (let i = 0; i < indice; i++) {
      acumulado += (datos[i].cantidad / total) * arcoUtil + hueco;
    }
    return circunferencia - acumulado;
  }

  // Recalcula el aviso visual de publicidades próximas a vencer.
  // Se ejecuta después de cada cambio importante para mantener sincronizado el menú con los datos.
  private updateAlerts(): void {
    const sections = this.seccionesNavegacion();
    const idxPub = sections.findIndex((s) => s.id === 'Publicidades');
    if (idxPub >= 0) {
      sections[idxPub] = { ...sections[idxPub], alert: this.calcularAlertaPublicidad() };
    }
    this.seccionesNavegacion.set([...sections]);
  }

  // Devuelve un estado global para la pestaña de publicidades.
  // Si existe una publicidad en rojo, la pestaña completa pasa a rojo.
  // Si no, pero sí hay alguna próxima a vencer, se muestra en amarillo.
  private calcularAlertaPublicidad(): 'warning' | 'danger' | undefined {
    const tienePeligro = this.publicidadesRegistradas().some((record) => this.calcularDiasRestantes(record.fechaFin) < 3);
    const tieneAdvertencia = this.publicidadesRegistradas().some((record) => {
      const diasRestantes = this.calcularDiasRestantes(record.fechaFin);
      return diasRestantes >= 3 && diasRestantes < 7;
    });

    if (tienePeligro) {
      return 'danger';
    }

    if (tieneAdvertencia) {
      return 'warning';
    }

    return undefined;
  }

  protected getActiveSectionLabel(): string {
    return this.seccionActiva();
  }

  protected get tarjetasEstadoInicio(): TarjetaEstado[] {
    return [
      {
        label: 'Empresas registradas',
        value: `${this.empresasRegistradas().length}`,
        description: 'Datos reales cargados desde la API y guardados en la base de datos.',
      },
      {
        label: 'Publicidades vigentes',
        value: `${this.obtenerPublicidadesVigentes().length}`,
        description: 'Solo las que ya iniciaron y todavía no vencen hoy.',
      },
    ];
  }

  protected get tarjetasMetricasInicio(): TarjetaMetrica[] {
    return [
      {
        label: 'Total de empresas',
        value: `${this.empresasRegistradas().length}`,
        note: 'Se sincroniza cada vez que guardas una empresa.',
        tone: 'success',
      },
      {
        label: 'Total de publicidades',
        value: `${this.publicidadesRegistradas().length}`,
        note: 'Se actualiza directamente desde el backend.',
        tone: 'info',
      },
      {
        label: 'Por vencer',
        value: `${this.obtenerPublicidadesPorVencer().length}`,
        note: 'Publicidades con menos de 7 días restantes.',
        tone: 'warning',
      },
      {
        label: 'Vencidas',
        value: `${this.obtenerPublicidadesVencidas().length}`,
        note: 'Necesitan revisión inmediata.',
        tone: 'neutral',
      },
    ];
  }

  private cargarEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        this.empresasRegistradas.set(empresas);
        this.resetPagina(this.paginaEmpresasConPublicidades);
        this.resetPagina(this.paginaEmpresasInactivas);
      },
      error: (error) => {
        console.error('No fue posible cargar las empresas.', error);
      },
    });
  }

  private cargarPublicidades(): void {
    this.publicidadService.getPublicidades().subscribe({
      next: (publicidades) => {
        this.publicidadesRegistradas.set(publicidades);
        this.resetPagina(this.paginaEmpresasConPublicidades);
        this.resetPagina(this.paginaEmpresasInactivas);
        this.resetPagina(this.paginaPublicidadesVencidas);
        this.updateAlerts();
      },
      error: (error) => {
        console.error('No fue posible cargar las publicidades.', error);
      },
    });
  }

  // Inserta una nueva empresa al inicio de la lista para verla de inmediato.
  // El nuevo id se calcula a partir del valor más alto actual para evitar colisiones.
  protected agregarEmpresa(empresa: Omit<Empresa, 'id'>, formulario: FormularioEmpresaComponent): void {
    this.empresaErrorMessage.set('');
    this.empresaService.crearEmpresa(empresa).subscribe({
      next: () => {
        formulario.clear();
        this.empresaErrorMessage.set('');
        this.cargarEmpresas();
      },
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No fue posible guardar la empresa.';
        this.empresaErrorMessage.set(mensaje);
        console.error('No fue posible guardar la empresa.', error);
      },
    });
  }

  protected iniciarEdicion(empresa: Empresa): void {
    this.empresaEditando.set(empresa);
    this.empresaErrorMessage.set('');
  }

  protected guardarEdicionEmpresa(event: { id: number; datos: Omit<Empresa, 'id'> }, formulario: FormularioEmpresaComponent): void {
    this.empresaErrorMessage.set('');
    this.empresaService.editarEmpresa(event.id, event.datos).subscribe({
      next: () => {
        this.empresaEditando.set(null);
        formulario.clear();
        this.empresaErrorMessage.set('');
        this.cargarEmpresas();
      },
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No fue posible actualizar la empresa.';
        this.empresaErrorMessage.set(mensaje);
        console.error('No fue posible actualizar la empresa.', error);
      },
    });
  }

  protected agregarPublicidad(entrada: NuevaPublicidadEntrada, formulario: FormularioPublicidadComponent): void {
    const empresaSeleccionada = this.empresasRegistradas().find((empresa) => empresa.id === entrada.empresaId);
    if (!empresaSeleccionada) return;
    this.publicidadErrorMessage.set('');
    this.publicidadService.crearPublicidad(entrada).subscribe({
      next: () => {
        formulario.clear();
        this.publicidadErrorMessage.set('');
        this.cargarPublicidades();
        this.cargarEmpresas();
      },
      error: (error) => {
        const errores = (error?.error?.errores ?? {}) as Record<string, string[] | string>;
        const detalle = Object.keys(errores).length
          ? Object.entries(errores)
              .map(([campo, msgs]) => `${campo}: ${Array.isArray(msgs) ? msgs.join(', ') : String(msgs)}`)
              .join(' | ')
          : '';
        const mensaje = error?.error?.mensaje ?? detalle ?? 'No fue posible guardar la publicidad.';
        this.publicidadErrorMessage.set(mensaje);
        console.error('No fue posible guardar la publicidad.', error);
      },
    });
  }

  protected iniciarEdicionPublicidad(publicidad: Publicidad): void {
    this.publicidadEditando.set(publicidad);
    this.publicidadErrorMessage.set('');
  }

  protected guardarEdicionPublicidad(
    event: { id: number; datos: EditarPublicidadEntrada; nuevoVideo?: File },
    formulario: FormularioPublicidadComponent
  ): void {
    this.publicidadErrorMessage.set('');
    // Si hay nuevo video, primero editar campos y luego subir video
    this.publicidadService.editarPublicidad(event.id, event.datos).subscribe({
      next: () => {
        if (event.nuevoVideo) {
          this.publicidadService.reemplazarVideo(event.id, event.nuevoVideo).subscribe({
            next: () => { this.finalizarEdicionPublicidad(formulario); },
            error: (error) => {
              const mensaje = error?.error?.mensaje ?? 'No fue posible reemplazar el video.';
              this.publicidadErrorMessage.set(mensaje);
            },
          });
        } else {
          this.finalizarEdicionPublicidad(formulario);
        }
      },
      error: (error) => {
        const mensaje = error?.error?.mensaje ?? 'No fue posible actualizar la publicidad.';
        this.publicidadErrorMessage.set(mensaje);
        console.error('No fue posible actualizar la publicidad.', error);
      },
    });
  }

  private finalizarEdicionPublicidad(formulario: FormularioPublicidadComponent): void {
    this.publicidadEditando.set(null);
    formulario.clear();
    this.publicidadErrorMessage.set('');
    this.cargarPublicidades();
    this.cargarEmpresas();
  }

  private obtenerPublicidadesVigentes(): Publicidad[] {
    return this.publicidadesRegistradas().filter((record) => {
      const hoy = this.normalizarFechaHoy();
      const fechaInicio = new Date(`${record.fechaInicio}T00:00:00`);
      const fechaFin = new Date(`${record.fechaFin}T23:59:59`);
      return fechaInicio <= hoy && fechaFin >= hoy;
    });
  }

  private obtenerPublicidadesPorVencer(): Publicidad[] {
    return this.publicidadesRegistradas().filter((record) => {
      const diasRestantes = this.calcularDiasRestantes(record.fechaFin);
      return diasRestantes >= 0 && diasRestantes < 7;
    });
  }

  private obtenerPublicidadesVencidas(): Publicidad[] {
    return this.publicidadesRegistradas().filter((record) => this.calcularDiasRestantes(record.fechaFin) < 0);
  }

  // Calcula cuántos días faltan para el vencimiento.
  // Se usa tanto para la alerta del menú como para el estado visual de cada publicidad.
  private calcularDiasRestantes(fechaFin: string): number {
    const hoy = this.normalizarFechaHoy();
    const fin = new Date(`${fechaFin}T23:59:59`);
    return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  /** Normaliza la fecha de hoy a medianoche local para comparaciones consistentes. */
  private normalizarFechaHoy(): Date {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
  }
}
