import { isPlatformBrowser } from '@angular/common';

/**
 * Devuelve la URL base del backend (Net.Backend) detectándola a partir
 * del host desde el que el usuario abrió la aplicación.
 *
 * - Si la página se sirve desde `http://localhost:4200` (o `127.0.0.1`),
 *   el frontend asume que el backend está en `http://localhost:5181`.
 * - Si la página se sirve desde `http://192.168.1.105:4200` (otro
 *   dispositivo de la LAN), se usa la misma IP con el puerto 5181.
 * - En SSR (Node) devuelve `http://localhost:5181` porque el servidor
 *   de Angular y el backend conviven en la misma máquina.
 *
 * Esto permite mantener el binding `0.0.0.0` del backend y del `ng serve`
 * sin tener que cambiar manualmente la IP en `environment.ts` cada vez
 * que el equipo obtiene una IP distinta en la red.
 */
export function detectarApiUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname } = window.location;
    if (hostname) {
      return `${protocol}//${hostname}:5181`;
    }
  }

  // SSR u otros entornos sin `window`: asumimos localhost.
  return 'http://localhost:5181';
}

/**
 * URL base del backend, calculada una sola vez al cargar el módulo.
 * Todos los servicios del frontend la consumen para hablar con Net.Backend.
 */
export const API_URL = detectarApiUrl();
