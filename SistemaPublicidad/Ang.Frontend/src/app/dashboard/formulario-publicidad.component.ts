import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Output, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Empresa, TipoPantallaPublicidad } from '../shared/models/modelo-publicidad';
import { NuevaPublicidadEntrada } from '../services/publicidad';
import { PreciosService, PrecioApi } from '../services/precios';
import { InputFilterDirective } from '../shared/directives/input-filter.directive';

@Component({
  selector: 'app-formulario-publicidad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFilterDirective],
  templateUrl: './formulario-publicidad.component.html',
  styleUrls: ['./formulario-publicidad.component.css'],
})
export class FormularioPublicidadComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tipoPantallaOptions: Array<{ value: TipoPantallaPublicidad; label: string; description: string }> = [
    {
      value: 'VerticalSamsung',
      label: '3 pantallas Samsung verticales',
      description: 'Formato vertical para piezas apiladas y lectura rápida.',
    },
    {
      value: 'HorizontalDescenso',
      label: 'Pantalla grande horizontal de descenso',
      description: 'Formato panorámico para alto impacto visual.',
    },
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
    {
      type: 'VerticalSamsung',
      title: '3 pantallas Samsung verticales',
      subtitle: 'Tarifa base mensual por duración de video.',
      basePrices: {
        10: 120000,
        15: 140000,
        20: 160000,
        25: 180000,
        30: 200000,
      },
    },
    {
      type: 'HorizontalDescenso',
      title: 'Pantalla grande horizontal de descenso',
      subtitle: 'Tarifa base mensual del formato principal.',
      basePrices: {
        10: 150000,
        15: 170000,
        20: 190000,
        25: 210000,
        30: 230000,
      },
    },
  ];

  readonly empresas = input<Empresa[]>([]);
  @Output() publicidadAgregada = new EventEmitter<NuevaPublicidadEntrada>();

  // Formulario reactivo de alta de publicidades con validación de fechas.
  // Cada control alimenta luego la tabla de publicidades y el cálculo de vencimiento.
  protected readonly form = this.formBuilder.nonNullable.group({
    empresaId: [0, [Validators.required, Validators.min(1)]],
    nombrePublicidad: ['', [Validators.required, Validators.minLength(3)]],
    tipoPantalla: ['VerticalSamsung' as TipoPantallaPublicidad, [Validators.required]],
    duracionVideoSegundos: [10, [Validators.required]],
    duracionMeses: [1, [Validators.required, Validators.min(1), Validators.max(12)]],
    fechaInicio: [this.getTodayValue(), Validators.required],
    fechaFin: ['', Validators.required],
    observaciones: [''],
  });

  private readonly preciosService = inject(PreciosService);

  constructor() {
    this.syncDates();

    // Actualizar fechas automáticamente cuando cambien la fecha de inicio o la cantidad de meses.
    this.form.controls.duracionMeses.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncDates());
    this.form.controls.fechaInicio.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.syncDates());

    // Intentar cargar precios desde el backend; si falla, se mantienen los valores por defecto.
    this.preciosService.getPrecios().subscribe({ next: (list) => this.applyPreciosFromApi(list), error: () => {} });
  }

  // Verifica el rango de fechas y emite la publicidad lista para guardar.
  // Si algo falla, marca todos los controles para que el usuario vea qué corregir.
  protected submit(): void {
    this.syncDates();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const startDate = new Date(`${value.fechaInicio}T00:00:00`);
    const endDate = new Date(`${this.form.controls.fechaFin.value}T00:00:00`);

    if (endDate < startDate) {
      this.form.controls.fechaFin.setErrors({ dateRange: true });
      this.form.markAllAsTouched();
      return;
    }

    this.publicidadAgregada.emit({
      empresaId: Number(value.empresaId),
      nombrePublicidad: value.nombrePublicidad.trim(),
      tipoPantalla: value.tipoPantalla,
      duracionVideoSegundos: Number(value.duracionVideoSegundos),
      duracionMeses: Number(value.duracionMeses),
      fechaInicio: value.fechaInicio,
      fechaFin: this.form.controls.fechaFin.value,
      observaciones: value.observaciones.trim(),
    });
  }

  // Limpia los valores del formulario para registrar una nueva publicidad.
  // Se expone como acción separada para mantener explícito el flujo de la interfaz.
  clear(): void {
    this.form.reset({
      empresaId: 0,
      nombrePublicidad: '',
      tipoPantalla: 'VerticalSamsung',
      duracionVideoSegundos: 10,
      duracionMeses: 1,
      fechaInicio: this.getTodayValue(),
      fechaFin: '',
      observaciones: '',
    });
    this.syncDates();
  }

  // Determina si un control debe pintarse como inválido.
  // Se usa en el template para mostrar borde y texto de error solo cuando corresponde.
  protected isInvalid(controlName: 'empresaId' | 'nombrePublicidad' | 'tipoPantalla' | 'duracionVideoSegundos' | 'duracionMeses' | 'fechaInicio' | 'fechaFin'): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.touched || control.dirty) : false;
  }

  // Devuelve el mensaje de error más útil para el campo recibido.
  protected getErrorMessage(controlName: 'empresaId' | 'nombrePublicidad' | 'tipoPantalla' | 'duracionVideoSegundos' | 'duracionMeses' | 'fechaInicio' | 'fechaFin'): string {
    const control = this.form.get(controlName);

    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es requerido.';
    }

    if (controlName === 'duracionMeses' && control.errors['min']) {
      return 'Selecciona una duración entre 1 y 12 meses.';
    }

    if (controlName === 'duracionMeses' && control.errors['max']) {
      return 'Selecciona una duración entre 1 y 12 meses.';
    }

    if (controlName === 'empresaId' && control.errors['min']) {
      return 'Debes seleccionar una empresa.';
    }

    if (controlName === 'tipoPantalla' && control.errors['required']) {
      return 'Selecciona una pantalla.';
    }

    if (control.errors['minlength']) {
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres.`;
    }

    if (control.errors['dateRange']) {
      return 'La fecha de fin debe ser igual o posterior a la fecha de inicio.';
    }

    return 'Campo inválido.';
  }

  protected syncDates(): void {
    const startDate = this.form.controls.fechaInicio.value;
    const months = Number(this.form.controls.duracionMeses.value);

    if (!startDate || !months) {
      return;
    }

    const computedEndDate = this.calculateEndDate(startDate, months);
    this.form.controls.fechaFin.setValue(computedEndDate, { emitEvent: false });
  }

  protected calculateEndDate(startDate: string, months: number): string {
    const baseDate = new Date(`${startDate}T00:00:00`);
    const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + months, baseDate.getDate());
    endDate.setDate(endDate.getDate() - 1);
    return this.formatDateToInput(endDate);
  }

  protected getScreenDescription(screenType: TipoPantallaPublicidad): string {
    return this.tipoPantallaOptions.find((option) => option.value === screenType)?.description ?? '';
  }

  protected getPrecioBase(screenType: TipoPantallaPublicidad, duration: number): number {
    const table = this.tablasPrecios.find((item) => item.type === screenType);
    return table?.basePrices[duration] ?? 0;
  }

  protected getPrecioTotal(screenType: TipoPantallaPublicidad, duration: number, months: number): number {
    return this.getPrecioBase(screenType, duration) * months;
  }

  protected getPrecioSeleccionado(): number {
    const value = this.form.getRawValue();
    return this.getPrecioTotal(value.tipoPantalla, Number(value.duracionVideoSegundos), Number(value.duracionMeses));
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private getTodayValue(): string {
    return this.formatDateToInput(new Date());
  }

  private formatDateToInput(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
  protected applyPreciosFromApi(list: PrecioApi[]): void {
    if (!list || list.length === 0) return;

    const grouped: Record<string, Record<number, number>> = {};
    for (const p of list) {
      if (!grouped[p.tipoPantalla]) grouped[p.tipoPantalla] = {};
      grouped[p.tipoPantalla][p.duracionSegundos] = p.precioMensual;
    }

    this.tablasPrecios.forEach((t) => {
      const map = grouped[t.type];
      if (map) {
        t.basePrices = { ...t.basePrices, ...map };
      }
    });
  }
}
