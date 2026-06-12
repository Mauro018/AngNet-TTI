// Panel principal que organiza el inicio, la gestión de empresas y la gestión de publicidades.
import { PLATFORM_ID } from '@angular/core';
import { Component, OnInit, afterNextRender, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { Empresa, Publicidad, TarjetaEstado, TarjetaMetrica } from '../shared/models/modelo-publicidad';
import { EmpresaService } from '../services/empresa';
import { EditarPublicidadEntrada, NuevaPublicidadEntrada, PublicidadService } from '../services/publicidad';
import { HeroeComponent } from './heroe.component';
import { ResumenComponent } from './resumen.component';
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
    Navbar,
    HeroeComponent,
    ResumenComponent,
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
export class PanelPrincipalComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);

  // Estado reactivo cargado desde la API para que los formularios persistan realmente en la base de datos.
  protected empresasRegistradas = signal<Empresa[]>([]);
  protected publicidadesRegistradas = signal<Publicidad[]>([]);
  protected empresaErrorMessage = signal('');
  protected publicidadErrorMessage = signal('');
  protected empresaEditando = signal<Empresa | null>(null);
  protected publicidadEditando = signal<Publicidad | null>(null);

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
    });
  }

  ngOnInit(): void {
    // ngOnInit se sigue ejecutando también en SSR. Lo dejamos vacío a
    // propósito: las llamadas HTTP se difieren a afterNextRender (browser).
  }

  // Sección activa del panel. Cada valor coincide con una opción de navegación.
  protected seccionActiva = signal('Inicio');
  // Navegación principal del panel.
  // La alerta de Publicidades se recalcula según los vencimientos para que el aviso sea visible desde arriba.
  protected readonly seccionesNavegacion = signal<SeccionNavegacion[]>([
    { id: 'Inicio', label: 'Inicio' },
    { id: 'Empresas', label: 'Empresas' },
    { id: 'Publicidades', label: 'Publicidades', alert: this.calculatePublicidadAlert() },
    { id: 'VistaPrevia', label: 'Vista previa' },
    { id: 'Pantallas', label: 'Pantallas' },
  ]);

  // Cambia la sección visible en la interfaz y refresca las alertas del menú.
  protected establecerSeccionActiva(sectionId: string): void {
    this.seccionActiva.set(sectionId);
    this.updateAlerts();
  }

  // Recalcula el aviso visual de publicidades próximas a vencer.
  // Se ejecuta después de cada cambio importante para mantener sincronizado el menú con los datos.
  private updateAlerts(): void {
    const sections = this.seccionesNavegacion();
    const idxPub = sections.findIndex((s) => s.id === 'Publicidades');
    if (idxPub >= 0) {
      sections[idxPub] = { ...sections[idxPub], alert: this.calculatePublicidadAlert() };
    }
    this.seccionesNavegacion.set([...sections]);
  }

  // Devuelve un estado global para la pestaña de publicidades.
  // Si existe una publicidad en rojo, la pestaña completa pasa a rojo.
  // Si no, pero sí hay alguna próxima a vencer, se muestra en amarillo.
  private calculatePublicidadAlert(): 'warning' | 'danger' | undefined {
    const hasDanger = this.publicidadesRegistradas().some((record) => this.getDaysRemaining(record.fechaFin) < 3);
    const hasWarning = this.publicidadesRegistradas().some((record) => {
      const daysRemaining = this.getDaysRemaining(record.fechaFin);
      return daysRemaining >= 3 && daysRemaining < 7;
    });

    if (hasDanger) {
      return 'danger';
    }

    if (hasWarning) {
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
        value: `${this.getPublicidadesVigentes().length}`,
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
        value: `${this.getPublicidadesPorVencer().length}`,
        note: 'Publicidades con menos de 7 días restantes.',
        tone: 'warning',
      },
      {
        label: 'Vencidas',
        value: `${this.getPublicidadesVencidas().length}`,
        note: 'Necesitan revisión inmediata.',
        tone: 'neutral',
      },
    ];
  }

  private cargarEmpresas(): void {
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        this.empresasRegistradas.set(empresas);
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

  private getPublicidadesVigentes(): Publicidad[] {
    return this.publicidadesRegistradas().filter((record) => {
      const today = new Date();
      const startDate = new Date(`${record.fechaInicio}T00:00:00`);
      const endDate = new Date(`${record.fechaFin}T23:59:59`);

      return startDate <= today && endDate >= today;
    });
  }

  private getPublicidadesPorVencer(): Publicidad[] {
    return this.publicidadesRegistradas().filter((record) => {
      const daysRemaining = this.getDaysRemaining(record.fechaFin);
      return daysRemaining >= 0 && daysRemaining < 7;
    });
  }

  private getPublicidadesVencidas(): Publicidad[] {
    return this.publicidadesRegistradas().filter((record) => this.getDaysRemaining(record.fechaFin) < 0);
  }

  // Calcula cuántos días faltan para el vencimiento.
  // Se usa tanto para la alerta del menú como para el estado visual de cada publicidad.
  private getDaysRemaining(endDate: string): number {
    const today = new Date();
    const date = new Date(`${endDate}T23:59:59`);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
}
