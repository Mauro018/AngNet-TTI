import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { rutasServidor } from './rutas/rutas';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(rutasServidor)),
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

