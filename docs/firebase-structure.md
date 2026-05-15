# Estructura de Firebase (Firestore)

Este documento describe cómo la aplicación usa Firebase (a través del backend) y las colecciones principales en Firestore.

**Resumen**
- **Acceso**: El frontend no se conecta directamente a la SDK de Firebase; usa un backend REST (`https://backend-aura-d0or.onrender.com`) que expone endpoints bajo `/api/firestore/`.
- **Autenticación**: Firebase Auth se gestiona vía endpoints del backend (`/api/auth/register`, `/api/auth/login`). El backend crea el user en Auth y escribe el perfil en Firestore.

**Colecciones y documentos**

- **usuarios** (`/api/firestore/usuarios`)
  - Campos comunes:
    - `id` (ID del documento)
    - `uid` (UID de Firebase Auth)
    - `nombre`, `apellido`, `correo`
    - `role` / `rol` (ej. `admin`, `psicologo`, `moderador`, `paciente`)
    - `activo` (boolean)
    - `documento`, `fechaNacimiento`, `edad`, `telefono`, `documentoUrl`
    - `reporte` (number)
    - `permisos`, `createdAt`, `updatedAt`
    - campos opcionales: `nombrePadre`, `parentescoPadre`, `observacionesPadres`, `autorizacionPadres` (objeto)
  - Notas: El cliente consulta por `correo` o por `uid`. El backend soporta `POST /query` para búsquedas.

- **ForoPublicaciones** (`/api/firestore/ForoPublicaciones`)
  - Documento ejemplo:
    - `id`, `titulo`, `contenido`, `autor`, `autorUid`, `rol`, `fecha` (ISO string)
    - `Comentarios`: array de objetos con:
      - `texto`, `autor`, `autorUid`, `fecha`, `reportado` (boolean)
      - `respuestas`: array de `{ texto, autor, fecha }`
  - Endpoints del cliente: GET lista, POST crear, PATCH para actualizar/guardar comentarios.

- **notificaciones** (`/api/firestore/notificaciones`)
  - Campos: `paraUid` (UID del destinatario), `mensaje`, `fecha` (ISO), `leida` (boolean)
  - Uso: se publica desde el servicio de foro y se recupera filtrando por `paraUid` en el cliente.

- **Citas** (`/api/firestore/Citas`)
  - Campos:
    - `id`, `paciente`, `psicologo`, `fecha` (ISO string), `motivo`, `estado` (`pendiente` | `confirmada`)
    - `createdAt`, `pacienteDocumento`, `pacienteUid`, `psicologoDocumento`, `psicologoUid`
  - Notas: el cliente valida disponibilidad localmente usando la lista obtenida del backend.

- **notasClinicas** (`/api/firestore/notasClinicas`)
  - Campos:
    - `id`, `categoria`, `createdAt`, `diagnostico`, `fecha`, `observaciones`
    - `pacienteNombre`, `pacienteUid`, `planTratamiento`, `psicologoUid`, `psicologoNombre`, `sintomas`
  - Endpoints: GET, POST, PUT, DELETE vía `/api/firestore/notasClinicas`.

**Comportamiento relevante y buenas prácticas**
- El frontend usa `BackendService` con `baseUrl = https://backend-aura-d0or.onrender.com`.
- Al registrar un usuario el flujo es: crear en Auth (`/api/auth/register`) → guardar perfil en `usuarios` (si falla, se intenta rollback en Auth).
- Para arrays anidados (Comentarios, respuestas) se envían como arreglos completos en el documento (no subcolecciones).
- Fechas se guardan como cadenas ISO en la mayoría de los lugares (`createdAt`, `fecha`, etc.).

Si quieres, puedo:
- Añadir reglas de seguridad sugeridas para Firestore.
- Producir ejemplos JSON para insertar documentos de muestra.
