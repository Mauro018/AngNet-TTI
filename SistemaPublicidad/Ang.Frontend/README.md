# Terminal de Transporte de Ibagué - Panel de Publicidades

Aplicación administrativa para gestionar empresas y publicidades del Terminal de Transporte de Ibagué. La interfaz está pensada para un solo rol: el administrador.

## Qué hace

- Muestra un inicio con información rápida y métricas clave.
- Permite registrar empresas con datos básicos de contacto.
- Permite crear publicidades asociadas a una empresa.
- Muestra avisos de vencimiento por colores:
  - rojo si falta menos de 3 días
  - amarillo si falta menos de 7 días
  - verde si todavía no está cerca de vencerse

## Estructura principal

- `src/app/app.ts`: carga el panel principal.
- `src/app/app.html`: inserta el panel principal.
- `src/app/dashboard/panel-principal.component.ts`: coordina la navegación y el estado local.
- `src/app/dashboard/panel-principal.component.html`: define lo que se ve en Inicio, Empresas y Publicidades.
- `src/app/dashboard/barra-navegacion.component.ts`: barra superior para cambiar de sección.
- `src/app/dashboard/heroe.component.ts`: bloque de bienvenida y resumen.
- `src/app/dashboard/resumen.component.ts`: tarjetas de métricas y estado.
- `src/app/dashboard/formulario-empresa.component.ts`: formulario para registrar empresas.
- `src/app/dashboard/lista-empresas.component.ts`: listado de empresas registradas.
- `src/app/dashboard/formulario-publicidad.component.ts`: formulario para crear publicidades.
- `src/app/dashboard/lista-publicidades.component.ts`: listado de publicidades y estado de vencimiento.
- `src/app/shared/models/modelo-publicidad.ts`: tipos compartidos del sistema.
- `src/app/shared/data/datos-panel.ts`: datos de ejemplo para arrancar la aplicación.

## Cómo ejecutar

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200/`.

## Flujo de uso

### Inicio

La sección de inicio muestra un resumen corto del sistema para que el administrador entienda el estado general sin saturación visual.

### Empresas

1. Abre la sección **Empresas**.
2. Completa el formulario con nombre, contacto, teléfono, correo, dirección y estado.
3. Pulsa **Registrar empresa**.
4. La empresa aparece en la lista de empresas registradas.

### Publicidades

1. Abre la sección **Publicidades**.
2. Selecciona una empresa registrada.
3. Define el nombre de la publicidad.
4. Selecciona la fecha de inicio y la fecha de finalización.
5. Pulsa **Registrar publicidad**.
6. La publicidad aparece en la lista con su estado visual.

## Documentación ampliada

La explicación detallada de cada parte, su uso y su propósito está en [docs/guia-del-panel.md](docs/guia-del-panel.md).

## Notas de mantenimiento

- El frontend usa componentes standalone de Angular.
- Los formularios están construidos con Reactive Forms.
- Los datos semilla viven en archivos compartidos para que sea más fácil reemplazarlos por una API más adelante.
- Si agregas nuevas secciones, sigue la misma convención: componente, plantilla, estilos y comentario breve de propósito.
