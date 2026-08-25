Actualmente:

- El endpoint GET /api/evidence/:id/download devuelve HTTP 501.
- Los archivos están en la carpeta evidence-files.
- Cada evidencia contiene un filename y pertenece a un usuario mediante owner_id.
- El frontend actualmente muestra la respuesta del endpoint en un alert.

Requisitos:

1. Solo usuarios autenticados pueden descargar archivos.
2. Un usuario solo puede descargar evidencias de su propiedad.
3. Responder:
   - 401 si no está autenticado.
   - 404 si la evidencia o el archivo no existen.
   - 403 si la evidencia pertenece a otro usuario.
4. Construir la ruta del archivo de forma segura. No permitir path traversal ni acceder a archivos fuera de evidence-files.
5. Entregar el archivo con headers adecuados:
   - Content-Type
   - Content-Disposition como attachment
   - Content-Length
6. Actualizar el frontend para que el botón descargue el archivo, en vez de mostrarlo en un alert.
7. Agregar o actualizar pruebas automatizadas que validen:
   - Descarga exitosa de una evidencia propia.
   - Rechazo de una evidencia ajena.
   - Solicitud sin autenticación.
   - Evidencia inexistente.
   - Archivo inexistente.
   - Intentos de path traversal.
8. Ejecutar todas las pruebas y explicar brevemente las decisiones de seguridad tomadas.