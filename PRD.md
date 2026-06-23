# Plan de Implementación: gpass — Gestor de Contraseñas (v0.1)

> Gestor de contraseñas con cifrado cliente-side (AES-GCM 256).
> Persistencia cloud (MongoDB), sin almacenamiento local.
> Login obligatorio vía geduma-auth.

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 |
| Estilos | CSS puro con custom properties (tema oscuro) |
| Cifrado | Web Crypto API (AES-GCM 256 + PBKDF2) |
| API | REST (`api.geduma.com/gpass`) |
| Auth | geduma-auth (OAuth con Google, GitHub, Microsoft) |
| Persistencia | Solo MongoDB vía API |
| Tests | Vitest + jsdom |

---

## 2. Auth

- OAuth vía `geduma-auth` con providers dinámicos.
- `POST /auth/login/{appId}/{providerId}` → redirect al provider.
- Callback → `session_token` en URL → `GET /auth/session/{token}` → user data.
- `user.email` → SHA-256 → `ownerHash`.
- JWT single-use renovado antes de cada request.
- Login obligatorio para operar (no hay modo local).

**Flujo**:
1. App carga → verifica `session_token` en URL o `localStorage`
2. Si no hay usuario → muestra `LoginModal`
3. Usuario selecciona provider → redirect a OAuth
4. Callback → sesión iniciada → se deriva `ownerHash`
5. Logout → limpia `localStorage` y estado

---

## 3. Modelo de Datos

```json
{
  "_id": "ObjectId",
  "title": "GitHub",
  "username": "felipe@geduma.com",
  "password": "ciphertext-base64",
  "strength": "strong",
  "compromised": false,
  "encrypted": true,
  "iv": "iv-base64",
  "updated": "2026-06-22",
  "created": "2026-01-01",
  "owner": "sha256-email"
}
```

**Campos en texto plano**: `title`, `username`, `strength`, `compromised`, `updated`, `created`, `owner`

**Campos cifrados** (AES-GCM 256 con clave derivada del email):
- `password` — la contraseña

**Metadatos de cifrado**:
- `encrypted: true` — flag para desencriptar al leer
- `iv` — vector de inicialización (base64)

---

## 4. API — Endpoints

**Base**: `https://api.geduma.com/gpass`

| Método | Ruta | Auth | Body/Params | Descripción |
|--------|------|------|-------------|-------------|
| GET | `/gpass` | Bearer | `owner` (req), `q` (opc), `security` (opc) | Lista entradas |
| GET | `/gpass/:id` | Bearer | `owner` (req) | Una entrada por `_id` |
| POST | `/gpass` | Bearer | `{ title, username, password, strength, encrypted, iv, owner }` | Crear entrada |
| PUT | `/gpass/:id` | Bearer | `{ title?, username?, password?, strength?, encrypted, iv, owner }` | Actualizar |
| DELETE | `/gpass/:id` | Bearer | `owner` (req) | Eliminar entrada |

**Notas**:
- El servidor NO inspecciona `password`, `encrypted` ni `iv`. Es almacenamiento ciego.
- Index en `owner` para queries eficientes.
- Búsqueda textual sobre `title` y `username` (texto plano).
- El flag `security=true` filtra por `strength=weak` o `compromised=true`.

---

## 5. Layout

### Desktop (>768px)

La lista de entradas es la vista principal (una sola columna). Al hacer clic en una entrada, el detalle se abre como overlay con fondo semitransparente.

```
┌──────────────────────────────────────────────────┐
│ 🔍 [Search...]    [+]  [🛡️ Alerts (N)]          │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────────────┐│
│  │ GitHub              felipe@geduma.com  [weak]││
│  │                                    2026-06-22││
│  ├──────────────────────────────────────────────┤│
│  │ example.com         admin@example.com        ││
│  │                                    2026-06-20││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  👤 avatar  displayName              [Logout]   │
├──────────────────────────────────────────────────┤
│  [Overlay EntryDetail]                           │
│  ┌────────────────────────────────┐              │
│  │  ✕ Edit Delete                │              │
│  │  GitHub                        │              │
│  │  Username  [•••••••] [Copy]    │              │
│  │  Password  [•••••••] [👁][Copy]│              │
│  │  Strength: Strong              │              │
│  └────────────────────────────────┘              │
└──────────────────────────────────────────────────┘
```

### Mobile (<768px)

Misma estructura, pero:
- Search bar colapsable (icono de lupa)
- Al hacer clic en entrada, el detalle ocupa pantalla completa
- Botón ← (back) en lugar de ✕ (close)
- Avatar + logout en header o menú hamburguesa

---

## 6. Componentes

### 6.1 Árbol de componentes

```
App.jsx
├── Spinner.jsx                  ← overlay de carga
├── LoginModal.jsx               ← selección de provider OAuth
├── EntryList.jsx                ← lista + search + filters + user info
│   └── (entradas renderizadas inline)
├── EntryDetail.jsx              ← vista/edición, overlay sobre la lista
│   └── PasswordGenerator.jsx    ← modal generador de contraseñas
└── ConfirmModal.jsx             ← confirmación para delete
```

### 6.2 App.jsx — Orquestación

**Estado global**:
```js
user: User | null
entries: Entry[]
activeEntry: Entry | null
searchQuery: string
securityFilter: boolean
loading: boolean
```

**Flujo principal**:
- `loadEntries()` → `fetchEntries(ownerHash, query, security, email)` → decrypt passwords → set `entries`
- `handleSelectEntry(id)` → busca en entries o fetch individual → set `activeEntry` → abre detalle
- `handleCreate(data)` → encrypt password → `POST /gpass` → refresh list
- `handleUpdate(id, fields)` → encrypt si cambió password → `PUT /gpass/:id` → refresh
- `handleDelete(id)` → `ConfirmModal` → `DELETE /gpass/:id` → refresh
- `handleSearch(q)` → update `searchQuery` → reload
- `handleSecurityToggle()` → toggle `securityFilter` → reload

No hay IndexedDB, no hay modo local, no hay slugs.

### 6.3 EntryList.jsx

Componente principal de la vista lista. Contiene:

- **Search bar**: input de texto, filtra por `title` y `username` (server-side)
- **Botón "+"**: abre `EntryDetail` en modo creación (entry vacío)
- **Toggle Security Alerts**: activa filtro `security=true`
- **Lista de entradas**: cada item muestra:
  - Título (negrita)
  - Username (texto secundario)
  - Badge si `weak` (amarillo) o `compromised` (rojo)
  - Fecha de actualización
  - Al hacer clic → `handleSelectEntry(id)`
- **User info** (abajo):
  - Avatar (imagen circular)
  - Display name
  - Botón Logout

### 6.4 EntryDetail.jsx — Un solo componente con toggle view/edit

**Modo vista** (default):
```
┌──────────────────────────────────────────┐
│  ✕ Close     [Edit]  [Delete]           │
├──────────────────────────────────────────┤
│  [Badge weak/compromised] si aplica      │
│                                          │
│  Title: GitHub                           │
│                                          │
│  Username                                │
│  ┌──────────────────────────────────┐    │
│  │ felipe@geduma.com      [Copy]    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Password                                │
│  ┌──────────────────────────────────┐    │
│  │ ••••••••••••••    [👁] [Copy]   │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Strength: Strong                        │
│  Updated: 2026-06-22                     │
└──────────────────────────────────────────┘
```

- Password oculta por defecto (`••••`)
- 👁 toggle para mostrar/ocultar
- Copy usa `navigator.clipboard.writeText()`
- Edit → cambia a modo edición
- Delete → abre `ConfirmModal`

**Modo edición** (toggle al hacer clic en Edit):
```
┌──────────────────────────────────────────┐
│  ✕ Cancel     [Save]                    │
├──────────────────────────────────────────┤
│  Title                                   │
│  ┌──────────────────────────────────┐    │
│  │ GitHub                           │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Username                                │
│  ┌──────────────────────────────────┐    │
│  │ felipe@geduma.com                │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Password                   [Generate]   │
│  ┌──────────────────────────────────┐    │
│  │ ••••••••••••••••••   [👁]       │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Strength: [▼ dropdown: strong/weak]     │
└──────────────────────────────────────────┘
```

- Campos se convierten en `<input>`
- Botón Generate abre `PasswordGenerator` modal
- Al seleccionar password del generador → se rellena el campo
- Save → valida → encrypt password → `updateEntry` → muestra Spinner → vuelve a vista
- Cancel → descarta cambios → vuelve a vista

**Toggle interno**: `useState<'view' | 'edit'>`

**Para crear** (nueva entrada): `EntryDetail` se abre directamente en modo edición con todos los campos vacíos.

### 6.5 PasswordGenerator.jsx (modal)

```
┌──────────────────────────────┐
│  Generate Password           │
│                              │
│  ┌────────────────────────┐  │
│  │  kD8#mP2$xL9@qR       │  │
│  └────────────────────────┘  │
│  [Copy]  [Regenerate]        │
│                              │
│  Longitud: 16 [────●────]    │
│  ☑ Mayúsculas                │
│  ☑ Minúsculas                │
│  ☑ Números                   │
│  ☑ Símbolos                  │
│                              │
│  [Use This Password]         │
└──────────────────────────────┘
```

Control de estado local:
- `length`: slider 8-32 (default 16)
- `uppercase`, `lowercase`, `numbers`, `symbols`: checkboxes (todos activos por defecto)
- `generated`: string con password generada
- Al menos un charset debe estar seleccionado

"Use This Password" → cierra modal y pasa la password al `EntryDetail`.

### 6.6 LoginModal.jsx

Lista de providers OAuth disponibles. Al hacer clic en un provider, inicia el flujo de login (redirect al provider).

Sin cambios respecto al sistema estándar de geduma-auth.

### 6.7 ConfirmModal.jsx

```
┌──────────────────────────────┐
│  ¿Eliminar entrada?          │
│                              │
│  Esto no se puede deshacer.  │
│                              │
│  [Cancel]  [Confirm]         │
└──────────────────────────────┘
```

Props: `message`, `onConfirm`, `onCancel`.

### 6.8 Spinner.jsx

Overlay con loader animado (CSS `@keyframes spin`). Se muestra durante llamadas API.

---

## 7. Hooks

### 7.1 `useAuth.js`

Expone:
- `user: { email, displayName, picture, provider, ownerHash } | null`
- `providers: []`
- `setProviders`
- `logout()`
- `fetchProviders(appId)`
- `startLogin(appId, providerId)`

**Flujo interno**:
1. Al montar: busca `session_token` en URL o usuario en `localStorage`
2. Si hay `session_token` → `GET /auth/session/{token}` → obtiene user → calcula `ownerHash = sha256(email)` → guarda en `localStorage`
3. `login()` → `GET /auth/providers/{appId}` → muestra providers → `POST /auth/login/{appId}/{providerId}` → redirect
4. `logout()` → limpia estado y `localStorage`

### 7.2 `useSecurityAlerts.js`

Lógica pura (no componente visual):
```js
function useSecurityAlerts(entries)
```

Retorna:
- `alertCount`: número de entradas con `weak` o `compromised`
- `isFilterActive`: boolean
- `toggleFilter`: función
- `filteredEntries`: entries filtradas si `isFilterActive`, sino todas

Filtra entries donde `strength === 'weak'` o `compromised === true`.

---

## 8. Utils

### 8.1 `crypto.js`

```js
deriveKey(email)
  → PBKDF2 con salt 'gpass-cipher-v1', 100k iteraciones
  → AES-GCM 256 key

encryptField(plaintext, email)
  → { ciphertext (base64), iv (base64) }

decryptField({ ciphertext, iv }, email)
  → plaintext (string)
```

### 8.2 `hash.js`

```js
sha256(text)
  → hex string (64 caracteres)
```

Usado para derivar `ownerHash = sha256(email)`.

### 8.3 `api.js`

Cliente REST con autenticación JWT single-use.

```js
// Auth
getToken()
  → POST /auth { name, user, key }
  → returns Bearer token (single-use)

// CRUD
fetchEntries(owner, query, securityOnly, email)
  → GET /gpass?owner=&q=&security=
  → Desencripta password de cada entry si encrypted === true
  → Returns Entry[]

getEntry(id, owner, email)
  → GET /gpass/:id?owner=
  → Desencripta password
  → Returns Entry

createEntry({ title, username, password, strength, owner }, email)
  → Encripta password con crypto.encryptField
  → POST /gpass { title, username, password(cipher), strength, encrypted: true, iv, owner }
  → Returns Entry

updateEntry(id, fields, email)
  → Si fields.password existe, encripta con crypto.encryptField
  → PUT /gpass/:id
  → Returns Entry

deleteEntry(id, owner)
  → DELETE /gpass/:id?owner=
  → Returns void
```

**Manejo de errores**:
- 204 → retorna `[]`
- 429 → rate limit
- Otros → parsea `json.msg`

---

## 9. Cifrado Cliente-Side (AES-GCM 256)

### Esquema

```
email
  ↓
PBKDF2(password=email, salt='gpass-cipher-v1', iterations=100000, hash=SHA-256)
  ↓
AES-GCM 256 key
  ↓
encrypt(plaintext) → { ciphertext (base64), iv (base64) }
decrypt({ ciphertext, iv }) → plaintext
```

- `iv`: 12 bytes aleatorios generados con `crypto.getRandomValues()`
- `ciphertext` incluye el tag de autenticación (GCM)
- La clave es determinística: mismo email → misma clave
- El servidor nunca tiene acceso a la clave

---

## 10. Diseño UI

### 10.1 Paleta de colores

```css
:root {
  --bg: #111111;
  --surface: #1A1A1A;
  --border: #2A2A2A;
  --text-primary: #EAEAEA;
  --text-secondary: #8B8B8B;
  --accent: #CFCFCF;
  --danger: #FF453A;
  --warning: #FFD60A;
  --success: #30D158;
  --brand: #0A84FF;
}
```

### 10.2 Clases CSS principales

| Clase | Elemento |
|-------|----------|
| `.app` | Contenedor principal |
| `.entry-list` | Contenedor de la lista |
| `.entry-item` | Fila en la lista |
| `.entry-item.active` | Fila seleccionada |
| `.entry-detail` | Overlay de detalle |
| `.entry-detail.view` | Modo vista |
| `.entry-detail.edit` | Modo edición |
| `.field-row` | Label + valor + botones |
| `.password-display` | Input de password |
| `.strength-badge` | Badge weak/compromised/strong |
| `.strength-badge.weak` | Badge amarillo |
| `.strength-badge.compromised` | Badge rojo |
| `.strength-badge.strong` | Badge verde |
| `.password-generator` | Modal generador |
| `.modal-overlay` | Fondo del modal |
| `.modal-content` | Contenido del modal |
| `.search-bar` | Input de búsqueda |
| `.user-info` | Avatar + nombre + logout |
| `.spinner` | Overlay de carga |
| `.btn` | Botón base |
| `.btn-primary` | Botón acción principal |
| `.btn-danger` | Botón eliminar |
| `.badge` | Badge genérico |

### 10.3 Responsive

- Breakpoint: `768px`
- Desktop: overlay de detalle centrado con max-width ~640px
- Mobile: detalle ocupa 100% viewport, header con botón back
- Search bar: en mobile se colapsa a icono de lupa

---

## 11. Tests

### 11.1 `test/crypto.test.js`

```js
describe('crypto.js')
  ✓ encryptField / decryptField roundtrip
  ✓ ciphertext diferente cada vez (IV aleatorio)
  ✓ clave determinística (mismo email → misma clave)
  ✓ string vacío se encripta/desencripta
  ✓ decrypt con iv incorrecto → error (tamper detection)
```

### 11.2 `test/api.test.js`

```js
describe('api.js')
  ✓ fetchEntries con owner
  ✓ fetchEntries con query de búsqueda
  ✓ fetchEntries con security filter
  ✓ createEntry encripta password antes de enviar
  ✓ updateEntry solo campos modificados
  ✓ deleteEntry
```

### 11.3 `test/hash.test.js`

```js
describe('hash.js')
  ✓ sha256 produce hash de 64 caracteres
  ✓ sha256 es determinístico
  ✓ sha256 de string vacío
```

---

## 12. Variables de Entorno

```env
VITE_API_AUTH_KEY=<your-api-key>
VITE_APP_ID=<your-app-id>
```

- `VITE_API_AUTH_KEY`: misma que el resto de apps geduma
- `VITE_APP_ID`: nueva app para gpass, registrarla en geduma-auth

---

## 13. Archivos del Proyecto

```
gpass/
├── index.html
├── vite.config.js
├── package.json
├── .env
├── .env.example
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── EntryList.jsx
│   │   ├── EntryDetail.jsx
│   │   ├── PasswordGenerator.jsx
│   │   ├── LoginModal.jsx
│   │   ├── ConfirmModal.jsx
│   │   └── Spinner.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useSecurityAlerts.js
│   └── utils/
│       ├── api.js
│       ├── crypto.js
│       └── hash.js
├── test/
│   ├── crypto.test.js
│   ├── api.test.js
│   └── hash.test.js
├── AGENTS.md
├── PRD.md
├── README.md
└── .gitignore
```

---

## 14. Orden de Implementación

| # | Paso | Descripción | Archivos |
|---|------|-------------|----------|
| 1 | **Init proyecto** | `npm create vite`, instalar dependencias, configurar vitest | `package.json`, `vite.config.js`, `index.html`, `.env`, `.gitignore` |
| 2 | **CSS base** | Custom properties, reset, layout base | `src/index.css` |
| 3 | **hash.js** | SHA-256 utility | `src/utils/hash.js`, `test/hash.test.js` |
| 4 | **crypto.js + tests** | AES-GCM 256 + PBKDF2 | `src/utils/crypto.js`, `test/crypto.test.js` |
| 5 | **useAuth.js** | Auth hook (login, logout, session) | `src/hooks/useAuth.js` |
| 6 | **api.js + tests** | REST client con cifrado integrado | `src/utils/api.js`, `test/api.test.js` |
| 7 | **Modals reutilizables** | LoginModal, Spinner, ConfirmModal | `src/components/LoginModal.jsx`, `Spinner.jsx`, `ConfirmModal.jsx` |
| 8 | **App.jsx** | Estado global, orquestación CRUD | `src/App.jsx`, `src/main.jsx` |
| 9 | **EntryList.jsx** | Lista, search, security toggle, user info | `src/components/EntryList.jsx` |
| 10 | **EntryDetail.jsx** | Vista/edición toggle, copy, show/hide | `src/components/EntryDetail.jsx` |
| 11 | **PasswordGenerator.jsx** | Modal generador | `src/components/PasswordGenerator.jsx` |
| 12 | **useSecurityAlerts.js** | Hook de filtro | `src/hooks/useSecurityAlerts.js` |
| 13 | **CSS completo** | Estilos detalle, lista, overlay, responsive | `src/index.css` |
| 14 | **Especificación backend** | Documento para crear API en geduma-api | `AGENTS.md` |
| 15 | **Build + deploy** | Verificar build y workflow Azure | `vite.config.js`, `.github/workflows/*` |

---

## 15. Especificación Backend (para geduma-api)

Ver `AGENTS.md` para la especificación detallada del módulo backend. Incluye:

- Schema MongoDB (modelo `gpass`)
- 5 endpoints REST (GET list, GET by id, POST, PUT, DELETE)
- Integración en `main.router.js`
- Misma autenticación JWT que el resto de APIs
- Almacenamiento ciego (`password`, `encrypted`, `iv` se guardan sin inspeccionar)
- Index en `owner` para queries eficientes
- Búsqueda textual en `title` y `username`
- Filtro `security=true` para `weak` y `compromised`
