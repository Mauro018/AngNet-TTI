import { Component } from '@angular/core';
import { PanelPrincipalComponent } from './dashboard/panel-principal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PanelPrincipalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
