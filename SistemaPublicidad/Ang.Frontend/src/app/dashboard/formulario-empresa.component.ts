import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Empresa, SectorIndustriaEmpresa } from '../shared/models/modelo-publicidad';
import { InputFilterDirective } from '../shared/directives/input-filter.directive';

@Component({
  selector: 'app-formulario-empresa',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, InputFilterDirective],
  templateUrl: './formulario-empresa.component.html',
  styleUrls: ['./formulario-empresa.component.css'],
})
export class FormularioEmpresaComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);

  @Input() errorMessage = '';
  /** Empresa a editar. Si es null el formulario está en modo creación. */
  @Input() empresaEditando: Empresa | null = null;

  @Output() empresaAgregada = new EventEmitter<Omit<Empresa, 'id'>>();
  @Output() empresaEditada  = new EventEmitter<{ id: number; datos: Omit<Empresa, 'id'> }>();
  @Output() cancelado       = new EventEmitter<void>();

  protected readonly sectoresIndustria: Array<{ value: SectorIndustriaEmpresa; label: string }> = [
    { value: 'TRANSPORTE',               label: 'Transporte' },
    { value: 'TECNOLOGIA',               label: 'Tecnología' },
    { value: 'SALUD',                    label: 'Salud' },
    { value: 'GOBIERNO_E_INST_PUBLICAS', label: 'Gobierno e Inst. Públicas' },
    { value: 'ALIMENTOS',               label: 'Alimentos' },
    { value: 'COMERCIO',                label: 'Comercio' },
    { value: 'ASEO',                    label: 'Aseo' },
    { value: 'FINANCIERO',              label: 'Financiero' },
    { value: 'OTROS',                   label: 'Otros' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    nombre:          ['', [Validators.required, Validators.minLength(3)]],
    nit:             ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
    representante:   ['', [Validators.required, Validators.minLength(2)]],
    cedula:          ['', [Validators.required, Validators.pattern(/^\d{7,10}$/)]],
    sectorIndustria: ['OTROS' as SectorIndustriaEmpresa, Validators.required],
    telefono:        ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    correo:          ['', [Validators.required, Validators.email]],
    estado:          ['Activa', Validators.required],
  });

  get modoEdicion(): boolean {
    return this.empresaEditando !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log("llegue")
    if (changes['empresaEditando']) {
      const e = this.empresaEditando;
      if (e) {
        // Cargar datos; bloquear campos que no se pueden editar.
        this.form.patchValue({
          nombre:          e.nombre,
          nit:             e.nit,
          representante:   e.representante,
          cedula:          e.cedula,
          sectorIndustria: e.sectorIndustria,
          telefono:        e.telefono,
          correo:          e.correo,
          estado:          e.estado,
        });
        this.form.controls.nombre.disable();
        this.form.controls.nit.disable();
        this.form.controls.sectorIndustria.disable();
      } else {
        this.form.controls.nombre.enable();
        this.form.controls.nit.enable();
        this.form.controls.sectorIndustria.enable();
      }
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const datos: Omit<Empresa, 'id'> = {
      nombre:          value.nombre.trim(),
      nit:             value.nit.trim(),
      representante:   value.representante.trim(),
      cedula:          value.cedula.trim(),
      sectorIndustria: value.sectorIndustria as SectorIndustriaEmpresa,
      telefono:        value.telefono.trim(),
      correo:          value.correo.trim(),
      estado:          value.estado as 'Activa' | 'Inactiva',
      fechaRegistro:   new Date().toISOString().slice(0, 10),
    };

    if (this.modoEdicion && this.empresaEditando) {
      this.empresaEditada.emit({ id: this.empresaEditando.id, datos });
    } else {
      this.empresaAgregada.emit(datos);
    }
  }

  clear(): void {
    const eraEdicion = this.modoEdicion;
    this.form.controls.nombre.enable();
    this.form.controls.nit.enable();
    this.form.controls.sectorIndustria.enable();
    this.form.reset({
      nombre:          '',
      nit:             '',
      representante:   '',
      cedula:          '',
      sectorIndustria: 'OTROS',
      telefono:        '',
      correo:          '',
      estado:          'Activa',
    });
    if (eraEdicion) {
      this.cancelado.emit();
    }
  }

  protected isInvalid(controlName: 'nombre' | 'nit' | 'representante' | 'cedula' | 'sectorIndustria' | 'telefono' | 'correo' | 'estado'): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.touched || control.dirty) : false;
  }

  protected getErrorMessage(controlName: 'nombre' | 'nit' | 'representante' | 'cedula' | 'sectorIndustria' | 'telefono' | 'correo' | 'estado'): string {
    const control = this.form.get(controlName);
    if (!control?.errors) return '';

    if (control.errors['required'])  return 'Este campo es requerido.';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres.`;
    if (control.errors['email'])     return 'Correo electrónico inválido.';
    if (control.errors['pattern']) {
      if (controlName === 'cedula')   return 'La cédula debe tener entre 7 y 10 dígitos.';
      if (controlName === 'nit')      return 'El NIT debe tener 9 dígitos.';
      if (controlName === 'telefono') return 'El teléfono debe tener 10 dígitos.';
    }

    return 'Campo inválido.';
  }
}
