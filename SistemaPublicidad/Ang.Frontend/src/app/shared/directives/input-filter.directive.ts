import { Directive, ElementRef, HostListener, Input } from '@angular/core';

type Mode = 'numeric' | 'alpha' | 'alphanumeric';

@Directive({
  selector: '[appInputFilter]',
  standalone: true,
})
export class InputFilterDirective {
  @Input('appInputFilter') mode: Mode = 'alphanumeric';
  @Input() uppercase = false;

  constructor(private el: ElementRef<HTMLInputElement | HTMLTextAreaElement>) {}

  @HostListener('input', ['$event']) onInput(_: Event) {
    const native = this.el.nativeElement as HTMLInputElement | HTMLTextAreaElement;
    let value = native.value ?? '';

    if (this.uppercase) {
      value = value.toUpperCase();
    }

    switch (this.mode) {
      case 'numeric':
        // Keep digits only
        value = value.replace(/\D+/g, '');
        break;
      case 'alpha':
        // Allow letters and spaces, include Spanish accented letters and Ñ
        value = value.replace(/[^A-ZÑÁÉÍÓÚÜ\s]/gi, '');
        break;
      case 'alphanumeric':
      default:
        // Allow letters, numbers and basic punctuation (.,-#/ )
        value = value.replace(/[^A-Z0-9ÑÁÉÍÓÚÜ\s\.,\-#\/]*/gi, '');
        break;
    }

    if (native.value !== value) {
      const start = (native as HTMLInputElement).selectionStart ?? value.length;
      native.value = value;
      // Dispatch input event so Angular updates FormControl
      native.dispatchEvent(new Event('input', { bubbles: true }));
      try {
        (native as HTMLInputElement).setSelectionRange(start, start);
      } catch {}
    }
  }
}
