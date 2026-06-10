import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-player',
  standalone: true,
  imports: [],
  template: `
    <div class="player-redirect">
      <p>Este componente es un marcador de compatibilidad. La reproducción se realiza en
        <code>/pantalla/VerticalSamsung</code> o <code>/pantalla/HorizontalDescenso</code>.</p>
    </div>
  `,
  styles: [`
    .player-redirect { padding: 1.5rem; color: #555; }
    code { background: rgba(0,0,0,0.05); padding: 0 0.25rem; border-radius: 0.25rem; }
  `],
})
export class PlayerComponent implements OnInit {
  ngOnInit(): void
  {
    // Marcador conservado por compatibilidad. La lógica real está en
    // /app/reproductor/reproductor-pantalla.ts.
  }
}
