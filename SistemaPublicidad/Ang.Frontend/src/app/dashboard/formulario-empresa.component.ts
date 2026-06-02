import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Empresa } from '../shared/models/modelo-publicidad';
import { InputFilterDirective } from '../shared/directives/input-filter.directive';

@Component({
  selector: 'app-formulario-empresa',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, InputFilterDirective],
  templateUrl: './formulario-empresa.component.html',
  styleUrls: ['./formulario-empresa.component.css'],
})
export class FormularioEmpresaComponent {
  private readonly formBuilder = inject(FormBuilder);

  @Input() errorMessage = '';

  @Output() empresaAgregada = new EventEmitter<Omit<Empresa, 'id'>>();

  // Formulario reactivo con validaciones mínimas para guardar datos consistentes.
  protected readonly form = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    nit: ['', [Validators.required, Validators.pattern(/^\d{9,}$/)]],
    contacto: ['', [Validators.required, Validators.minLength(2)]],
    sectorIndustria: ['', [Validators.required, Validators.minLength(3)]],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{7,}$/)]],
    correo: ['', [Validators.required, Validators.email]],
    direccion: ['', [Validators.required, Validators.minLength(5)]],
    estado: ['Activa', Validators.required],
  });

  // Valida el formulario, normaliza la información y emite la nueva empresa.
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.empresaAgregada.emit({
      nombre: value.nombre.trim(),
      nit: value.nit.trim(),
      contacto: value.contacto.trim(),
      sectorIndustria: value.sectorIndustria.trim(),
      telefono: value.telefono.trim(),
      correo: value.correo.trim(),
      direccion: value.direccion.trim(),
      estado: value.estado as 'Activa' | 'Inactiva',
      fechaRegistro: new Date().toISOString().slice(0, 10),
    });
  }

  // Limpia el formulario y devuelve los valores iniciales.
  clear(): void {
    this.form.reset({
      nombre: '',
      nit: '',
      contacto: '',
      sectorIndustria: '',
      telefono: '',
      correo: '',
      direccion: '',
      estado: 'Activa',
    });
  }

  // Indica si un control debe mostrarse en estado de error visual.
  protected isInvalid(controlName: 'nombre' | 'nit' | 'contacto' | 'sectorIndustria' | 'telefono' | 'correo' | 'direccion' | 'estado'): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.touched || control.dirty) : false;
  }

  // Devuelve un texto de error corto para mostrar debajo del campo.
  protected getErrorMessage(controlName: 'nombre' | 'nit' | 'contacto' | 'sectorIndustria' | 'telefono' | 'correo' | 'direccion' | 'estado'): string {
    const control = this.form.get(controlName);
    if (!control?.errors) return '';

    if (control.errors['required']) return 'Este campo es requerido.';
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres.`;
    if (control.errors['email']) return 'Correo electrónico inválido.';
    if (control.errors['pattern']) return 'Teléfono debe tener al menos 7 dígitos.';

    return 'Campo inválido.';
  }
}
