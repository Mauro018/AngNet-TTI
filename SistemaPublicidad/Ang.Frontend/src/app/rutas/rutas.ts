import { Routes } from '@angular/router';
import { ServerRoute, RenderMode } from '@angular/ssr';
import { PanelPrincipalComponent } from '../dashboard/panel-principal.component';

/**
 * Rutas de la SPA.
 *
 * - ''  → Panel principal (dashboard con empresas, publicidades, vista previa en vivo).
 * - 'pantalla/:tipoPantalla' → Reproductor a pantalla completa para TVs / portátiles.
 * - '**' → Redirige al panel principal.
 */
export const rutas: Routes = [
  {
    path: '',
    component: PanelPrincipalComponent,
    title: 'Panel de publicidades',
  },
  {
    path: 'pantalla/:tipoPantalla',
    loadComponent: () =>
      import('../reproductor/reproductor-pantalla').then(
        (m) => m.ReproductorPantallaComponent
      ),
    title: 'Reproductor de publicidades',
  },
  {
    path: '**',
    redirectTo: '',
  },
];

/**
 * Variante de las rutas usada por SSR. Las rutas que no se pueden
 * pre-renderizar (porque dependen de SignalR o del navegador) se
 * fuerzan a renderMode 'client'.
 */
export const rutasServidor: ServerRoute[] = rutas.map((ruta) => ({
  ...(ruta as object),
  renderMode: RenderMode.Client,
})) as ServerRoute[];
