# Guía del panel de administración

## Objetivo

Este panel administra la operación publicitaria del Terminal de Transporte de Ibagué. Está orientado a un único perfil de usuario: el administrador.

## Arquitectura general

### Entrada de la aplicación

- `src/app/app.ts`: monta el panel principal.
- `src/app/app.html`: contiene el selector raíz de la aplicación.
- `src/app/app.css`: define estilos globales y variables visuales.

### Panel principal

- `src/app/dashboard/panel-principal.component.ts`: coordina el estado local, la navegación y el registro de empresas y publicidades.
- `src/app/dashboard/panel-principal.component.html`: decide qué sección se muestra según la opción seleccionada.
- `src/app/dashboard/panel-principal.component.css`: controla el layout general.

### Inicio

- `src/app/dashboard/heroe.component.ts`: muestra el mensaje de bienvenida.
- `src/app/dashboard/resumen.component.ts`: presenta las tarjetas rápidas del sistema.

### Empresas

- `src/app/dashboard/formulario-empresa.component.ts`: formulario para registrar empresas.
- `src/app/dashboard/lista-empresas.component.ts`: tabla con las empresas registradas.

### Publicidades

- `src/app/dashboard/formulario-publicidad.component.ts`: formulario para crear publicidades.
- `src/app/dashboard/lista-publicidades.component.ts`: tabla con las publicidades y su estado por vencimiento.

### Navegación

- `src/app/dashboard/barra-navegacion.component.ts`: barra superior para cambiar entre Inicio, Empresas y Publicidades.

### Datos y modelos

- `src/app/shared/models/modelo-publicidad.ts`: define los tipos y contratos de datos.
- `src/app/shared/data/datos-panel.ts`: contiene los datos semilla para iniciar la aplicación.

## Cómo funciona cada sección

### Inicio

La vista de inicio resume el sistema con pocas tarjetas y un mensaje corto. Su objetivo es dar una lectura rápida de la situación general.

### Empresas

El formulario de empresas permite registrar datos básicos de contacto y estado. Al guardar, la empresa aparece en la lista inmediatamente.

### Publicidades

El formulario de publicidades pide una empresa, un nombre, una fecha de inicio y una fecha de fin. Luego se muestra en la lista con un color según su vencimiento.

## Reglas de vencimiento

- **Rojo**: faltan menos de 3 días.
- **Amarillo**: faltan menos de 7 días.
- **Verde**: la publicidad todavía no entra en zona de alerta.

## Validaciones

- El nombre, contacto, teléfono, correo y dirección de la empresa son obligatorios.
- La publicidad requiere empresa, nombre y fechas válidas.
- La fecha de fin no puede ser anterior a la fecha de inicio.

## Cómo extender el proyecto

1. Crea un componente por cada nueva sección.
2. Mantén HTML, CSS y TypeScript en archivos separados.
3. Usa nombres en español para mantener la claridad del proyecto.
4. Agrega comentarios breves solo donde la lógica no sea obvia.
5. Si una sección necesita persistencia, reemplaza los datos semilla por una API.

## Flujo recomendado de trabajo

1. Registrar empresas.
2. Crear publicidades asociadas.
3. Revisar la lista de publicidades y sus avisos de vencimiento.
4. Mantener actualizado el archivo de datos iniciales mientras no haya backend conectado.
