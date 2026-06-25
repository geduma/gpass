# gpass — Especificación Backend para geduma-api

> Especificación para crear el módulo `gpass` en `geduma-api`.

---

## 1. Estructura de Archivos

```
src/apis/gpass/
├── gpass.routes.js
├── gpass.model.js
├── gpass.validation.js
├── models/
│   └── allowed-users.model.js
└── services/
    ├── gpass.service.js
    └── allowed-users.service.js
```

---

## 2. Modelo MongoDB (`gpass.model.js`)

Colección: `gpass`

```js
{
  _id: ObjectId,
  title: String,         // texto plano, requerido
  username: String,      // texto plano, requerido
  password: String,      // ciphertext base64 (AES-GCM), requerido
  strength: String,      // 'strong' | 'weak', default 'strong'
  compromised: Boolean,  // default false
  encrypted: Boolean,    // default true
  iv: String,           // IV base64, requerido si encrypted=true
  owner: String,         // SHA-256 del email, requerido, indexado
  created: String,       // fecha ISO (YYYY-MM-DD)
  updated: String        // fecha ISO (YYYY-MM-DD)
}
```

**Index**: `{ owner: 1 }` para queries por owner.

**Nota**: El servidor NO debe inspeccionar ni modificar `password`, `encrypted` ni `iv`. Son datos cifrados client-side que se almacenan y devuelven tal cual.

---

### 2.1. Modelo `allowed_users` (`allowed-users.model.js`)

Colección: `allowed_users`

```js
{
  _id: ObjectId,
  email: String,     // email en lowercase, unique, requerido
  enabled: Boolean,  // default true
  timestamps: true   // createdAt, updatedAt
}
```

**Index**: `{ email: 1 }` (unique).

---

## 3. Rutas Express (`gpass.routes.js`)

### 3.1. GET `/gpass`

Lista entradas de un usuario, con búsqueda opcional y filtro de seguridad.

**Query params**:
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `owner` | String | Sí | SHA-256 del email |
| `q` | String | No | Búsqueda textual sobre `title` y `username` |
| `security` | String | No | `'true'` para filtrar weak/compromised |

**Respuesta**:
```json
{
  "ok": true,
  "data": [ ...entries ]
}
```

Si no hay resultados, retornar `204 No Content`.

### 3.2. GET `/gpass/:id`

Obtiene una entrada por `_id`.

**Query params**: `owner` (requerido)

**Respuesta**:
```json
{
  "ok": true,
  "data": { ...entry }
}
```

### 3.3. POST `/gpass`

Crea una nueva entrada.

**Body** (JSON):
```json
{
  "title": "GitHub",
  "username": "user@email.com",
  "password": "ciphertext-base64",
  "strength": "strong",
  "encrypted": true,
  "iv": "iv-base64",
  "owner": "sha256-email"
}
```

**Respuesta**:
```json
{
  "ok": true,
  "data": { ...entryConFechas }
}
```

Generar `created` y `updated` server-side.

### 3.4. PUT `/gpass/:id`

Actualiza una entrada existente. Solo se envían los campos modificados.

**Body** (JSON, todos opcionales excepto `owner`):
```json
{
  "title": "New Title",
  "username": "new@email.com",
  "password": "new-ciphertext",
  "strength": "weak",
  "encrypted": true,
  "iv": "new-iv",
  "owner": "sha256-email"
}
```

**Respuesta**:
```json
{
  "ok": true,
  "data": { ...entryActualizado }
}
```

Actualizar `updated` server-side.

### 3.5. DELETE `/gpass/:id`

Elimina una entrada.

**Query params**: `owner` (requerido)

**Respuesta**:
```json
{
  "ok": true,
  "msg": "Entrada eliminada"
}
```

---

## 4. Integración en `main.router.js`

```js
import { gpassRouter } from './apis/gpass/gpass.routes.js'

export function router(app) {
  // ... routers existentes ...
  gpassRouter(app)
}
```

El router debe registrarse con base path `/gpass`.

---

## 5. Autenticación

Usar el middleware de autenticación estándar del proyecto. Requiere:
- JWT single-use obtenido via `POST /auth`
- Header `Authorization: Bearer {token}`

---

### 3.6. GET `/gpass/allowed`

Verifica si el usuario autenticado está autorizado a usar gpass.

**Headers**:
| Header | Valor |
|--------|-------|
| `Authorization` | `Bearer <jwt>` |

El JWT debe ser obtenido previamente vía `POST /auth` con `{ name: 'gpass', user: <email>, key: <API_GPASS_KEY> }`.

El email se extrae del campo `data.user` del JWT.

**Response**:

`200 — OK`
```json
{
  "ok": true,
  "data": {
    "allowed": true
  }
}
```

```json
{
  "ok": true,
  "data": {
    "allowed": false
  }
}
```

`400 — Token inválido` (si el JWT no contiene `data.user`)
```json
{
  "ok": false,
  "msg": "Invalid token payload"
}
```

`401 — No autorizado` (JWT ausente, expirado, o inválido)
```json
{
  "ok": false,
  "msg": "Unauthorized: invalid or missing token"
}
```

**Notas**:
- La lista de emails permitidos se administra insertando documentos directamente en la colección `allowed_users` de la base de datos de gpass
- Rate limit: 60 requests/minuto

---

## 6. Frontend — Control de Acceso

El frontend (`gpass`) verifica si el usuario está autorizado inmediatamente después del login:

1. Usuario se autentica vía OAuth → `useAuth` expone `{ email, ownerHash, ... }`
2. `App.jsx` llama a `checkAllowed(email)` → `GET /gpass/allowed`
3. Mientras se verifica: se muestra `<Spinner />` (pantalla completa)
4. Si `allowed === false`:
   - Se muestra mensaje "You do not have access to gpass." sobre el `LoginModal`
   - Se ejecuta `logout()` automáticamente
   - El mensaje desaparece a los 4 segundos
5. Si `allowed === true`: se carga la UI normal (`EntryList`, `EntryDetail`)

**Archivos involucrados**:
- `src/utils/api.js` — función `checkAllowed(email)`
- `src/App.jsx` — estado `allowed`, efecto de verificación, render condicional
- `src/components/LoginModal.jsx` — prop `restrictedMsg` para mostrar error de acceso
- `src/index.css` — clase `.restricted-banner` para el mensaje de error

---

## 7. Notas

- Almacenamiento ciego: `password`, `encrypted` e `iv` se guardan y devuelven sin procesar.
- Búsqueda textual sobre `title` y `username`.
- Filtro security: `{ $or: [{ strength: 'weak' }, { compromised: true }] }`.
- Owner es obligatorio en todas las operaciones.
- El `_id` de MongoDB se usa como identificador (no hay slugs).
