export const environment = {
  production: false,
  // El frontend detecta automáticamente la URL del backend a partir
  // del host desde el que se abre la página (ver services/detectar-api.ts).
  // Mantenemos este campo por compatibilidad con código existente.
  apiUrl: 'http://localhost:5181'
};
