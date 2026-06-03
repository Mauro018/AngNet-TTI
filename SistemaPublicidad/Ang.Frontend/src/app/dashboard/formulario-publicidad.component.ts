// Formulario de alta y ediciÃ³n de publicidades con soporte de video.
import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Empresa, Publicidad, TipoPantallaPublicidad } from '../shared/models/modelo-publicidad';
import { EditarPublicidadEntrada, NuevaPublicidadEntrada, PublicidadService } from '../services/publicidad';
import { PreciosService, PrecioApi } from '../services/precios';
import { InputFilterDirective } from '../shared/directives/input-filter.directive';

@Component({
  selector: 'app-formulario-publicidad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFilterDirective],
  templateUrl: './formulario-publicidad.component.html',
  styleUrls: ['./formulario-publicidad.component.css'],
})
export class FormularioPublicidadComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly publicidadService = inject(PublicidadService);

  protected readonly tipoPantallaOptions: Array<{ value: TipoPantallaPublicidad; label: string; description: string }> = [
    { value: 'VerticalSamsung',    label: 'Vertical',   description: 'Formato vertical para piezas apiladas y lectura rÃ¡pida.' },
    { value: 'HorizontalDescenso', label: 'Horizontal', description: 'Formato panorÃ¡mico para alto impacto visual.' },
  ];

  protected readonly duracionVideoOptions = [10, 15, 20, 25, 30] as const;
  protected readonly duracionMesesOptions = Array.from({ length: 12 }, (_, index) => index + 1);
  protected readonly mesesPrecios = Array.from({ length: 12 }, (_, index) => index + 1);

  protected readonly tablasPrecios: Array<{
    type: TipoPantallaPublicidad;
    title: string;
    subtitle: string;
    basePrices: Record<number, number>;
  }> = [
    { type: 'VerticalSamsung',    title: 'Vertical',   subtitle: 'Tarifa base mensual por duraciÃ³n de video.', basePrices: { 10:120000, 15:140000, 20:160000, 25:180000, 30:200000 } },
    { type: 'HorizontalDescenso', title: 'Horizontal', subtitle: 'Tarifa base mensual del formato principal.',  basePrices: { 10:150000, 15:170000, 20:190000, 25:210000, 30:230000 } },
  ];

  readonly empresas = input<Empresa[]>([]);
  @Input() errorMessage = '';
  @Input() publicidadEditando: Publicidad | null = null;

  @Output() publicidadAgregada = new EventEmitter<NuevaPublicidadEntrada>();
  @Output() publicidadEditada  = new EventEmitter<{ id: number; datos: EditarPublicidadEntrada; nuevoVideo?: File }>();
  @Output() cancelado          = new EventEmitter<void>();

  protected videoSeleccionado: File | null = null;
  protected videoNombreActual = '';
  protected videoError = '';

  protected readonly form = this.formBuilder.nonNullable.group({
    empresaId:             [0, [Validators.required, Validators.min(1)]],
    nombrePublicidad:      ['', [Validators.required, Validators.minLength(3)]],
    tipoPantalla:          ['VerticalSamsung' as TipoPantallaPublicidad, [Validators.required]],
    duracionVideoSegundos: [10, [Validators.required]],
    duracionMeses:         [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    fechaInicio:           [this.getTodayValue(), [Validators.required]],
    fechaFin:              ['', [Validators.required]],
    observaciones:         [''],
  });

  get modoEdicion(): boolean { return this.publicidadEditando !== null; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['publicidadEditando']) {
      const p = this.publicidadEditando;
      if (p) {
        this.form.patchValue({
          empresaId: p.empresaId, nombrePublicidad: p.nombrePublicidad,
          tipoPantalla: p.tipoPantalla, duracionVideoSegundos: p.duracionVideoSegundos,
          duracionMeses: p.duracionMeses, fechaInicio: p.fechaInicio,
          fechaFin: p.fechaFin, observaciones: p.observaciones,
        });
        this.form.controls.empresaId.disable();
        this.form.controls.nombrePublicidad.disable();
        this.form.controls.tipoPantalla.disable();
        this.form.controls.duracionVideoSegundos.disable();
        this.videoNombreActual = p.videoNombreArchivo ? 'Video ya cargado' : '';
        this.videoSeleccionado = null;
        this.videoError = '';
      } else {
        this.form.controls.empresaId.enable();
        this.form.controls.nombrePublicidad.enable();
        this.form.controls.tipoPantalla.enable();
        this.form.controls.duracionVideoSegundos.enable();
        this.videoNombreActual = '';
        this.videoSeleccionado = null;
        this.videoError = '';
      }
    }
  }

  protected onVideoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.videoError = '';
    if (!file) { this.videoSeleccionado = null; return; }
    const allowed = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
    if (!allowed.includes(ext)) {
      this.videoError = 'Formato no permitido. Usa mp4, mov, avi, mkv o webm.';
      this.videoSeleccionado = null; input.value = ''; return;
    }
    if (file.size > 200 * 1024 * 1024) {
      this.videoError = 'El video supera los 200 MB.';
      this.videoSeleccionado = null; input.value = ''; return;
    }
    this.videoSeleccionado = file;
    this.videoNombreActual = file.name;
  }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.modoEdicion && !this.videoSeleccionado) {
      this.videoError = 'El video es obligatorio.'; return;
    }
    const value = this.form.getRawValue();
    const startDate = new Date(`${value.fechaInicio}T00:00:00`);
    const endDate   = new Date(`${this.form.controls.fechaFin.value}T00:00:00`);
    if (endDate < startDate) {
      this.form.controls.fechaFin.setErrors({ dateRange: true });
      this.form.markAllAsTouched(); return;
    }
    if (this.modoEdicion && this.publicidadEditando) {
      this.publicidadEditada.emit({
        id: this.publicidadEditando.id,
        datos: { duracionMeses: Number(value.duracionMeses), fechaInicio: value.fechaInicio, observaciones: value.observaciones.trim() },
        nuevoVideo: this.videoSeleccionado ?? undefined,
      });
    } else {
      this.publicidadAgregada.emit({
        empresaId: Number(value.empresaId), nombrePublicidad: value.nombrePublicidad.trim(),
        tipoPantalla: value.tipoPantalla, duracionVideoSegundos: Number(value.duracionVideoSegundos),
        duracionMeses: Number(value.duracionMeses), fechaInicio: value.fechaInicio,
        fechaFin: this.form.controls.fechaFin.value, observaciones: value.observaciones.trim(),
        video: this.videoSeleccionado!,
      });
    }
  }

  clear(): void {
    const eraEdicion = this.modoEdicion;
    this.form.controls.empresaId.enable();
    this.form.controls.nombrePublicidad.enable();
    this.form.controls.tipoPantalla.enable();
    this.form.controls.duracionVideoSegundos.enable();
    this.form.reset({
      empresaId: 0, nombrePublicidad: '', tipoPantalla: 'VerticalSamsung',
      duracionVideoSegundos: 10, duracionMeses: 1,
      fechaInicio: this.getTodayValue(), fechaFin: '', observaciones: '',
    });
    this.videoSeleccionado = null; this.videoNombreActual = ''; this.videoError = '';
    this.syncDates();
    if (eraEdicion) this.cancelado.emit();
  }

  protected isInvalid(controlName: 'empresaId' | 'nombrePublicidad' | 'tipoPantalla' | 'duracionVideoSegundos' | 'duracionMeses' | 'fechaInicio' | 'fechaFin'): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.touched || control.dirty) : false;
  }

  protected getErrorMessage(controlName: 'empresaId' | 'nombrePublicidad' | 'tipoPantalla' | 'duracionVideoSegundos' | 'duracionMeses' | 'fechaInicio' | 'fechaFin'): string {
    const control = this.form.get(controlName);
    if (!control?.errors) return '';
    if (control.errors['required']) return 'Este campo es requerido.';
    if (controlName === 'duracionMeses' && (control.errors['min'] || control.errors['max'])) return 'Selecciona una duraciÃ³n entre 1 y 12 meses.';
    if (controlName === 'empresaId' && control.errors['min']) return 'Debes seleccionar una empresa.';
    if (control.errors['minlength']) return `MÃ­nimo ${control.errors['minlength'].requiredLength} caracteres.`;
    if (control.errors['dateRange']) return 'La fecha de fin debe ser igual o posterior a la fecha de inicio.';
    return 'Campo invÃ¡lido.';
  }

  protected syncDates(): void {
    const startDate = this.form.controls.fechaInicio.value;
    const months = Number(this.form.controls.duracionMeses.value);
    if (!startDate || !months) return;
    this.form.controls.fechaFin.setValue(this.calculateEndDate(startDate, months), { emitEvent: false });
  }

  protected calculateEndDate(startDate: string, months: number): string {
    const baseDate = new Date(`${startDate}T00:00:00`);
    const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + months, baseDate.getDate());
    endDate.setDate(endDate.getDate() - 1);
    return this.formatDateToInput(endDate);
  }

  protected getScreenDescription(screenType: TipoPantallaPublicidad): string {
    return this.tipoPantallaOptions.find((o) => o.value === screenType)?.description ?? '';
  }

  protected getPrecioBase(screenType: TipoPantallaPublicidad, duration: number): number {
    return this.tablasPrecios.find((t) => t.type === screenType)?.basePrices[duration] ?? 0;
  }

  protected getPrecioTotal(screenType: TipoPantallaPublicidad, duration: number, months: number): number {
    return this.getPrecioBase(screenType, duration) * months;
  }

  protected getPrecioSeleccionado(): number {
    const v = this.form.getRawValue();
    return this.getPrecioTotal(v.tipoPantalla, Number(v.duracionVideoSegundos), Number(v.duracionMeses));
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }

  private getTodayValue(): string { return this.formatDateToInput(new Date()); }

  private formatDateToInput(date: Date): string {
    return `${date.getFullYear()}-${`${date.getMonth()+1}`.padStart(2,'0')}-${`${date.getDate()}`.padStart(2,'0')}`;
  }

  protected applyPreciosFromApi(list: PrecioApi[]): void {
    if (!list?.length) return;
    const grouped: Record<string, Record<number, number>> = {};
    for (const p of list) {
      if (!grouped[p.tipoPantalla]) grouped[p.tipoPantalla] = {};
      grouped[p.tipoPantalla][p.duracionSegundos] = p.precioMensual;
    }
    this.tablasPrecios.forEach((t) => {
      const map = grouped[t.type];
      if (map) t.basePrices = { ...t.basePrices, ...map };
    });
  }
}


