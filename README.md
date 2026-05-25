# SATRA — Sistema de Alerta Temprana de Riesgo Académico
### Corporación Universitaria Latinoamericana (CUL)

---

## Estructura del proyecto

```
satra/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── supabase.js        # Cliente Supabase (service role)
│   │   │   └── email.js           # Nodemailer + plantillas HTML
│   │   ├── controllers/
│   │   │   ├── authController.js       # Login, registro, recuperación
│   │   │   ├── usuariosController.js   # CRUD usuarios
│   │   │   ├── clasesController.js     # CRUD clases
│   │   │   ├── matriculasController.js # Matrículas
│   │   │   ├── tareasController.js     # Tareas + archivos
│   │   │   ├── entregasController.js   # Entregas de estudiantes
│   │   │   ├── notasController.js      # Notas + alertas académicas
│   │   │   ├── asistenciaController.js # Registro de asistencia
│   │   │   ├── comentariosController.js
│   │   │   └── notificacionesController.js
│   │   ├── middlewares/
│   │   │   ├── auth.js            # verificarToken + requiereRol
│   │   │   ├── upload.js          # Multer (10MB, tipos válidos)
│   │   │   └── validacion.js      # Validaciones de entrada
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── usuarios.js
│   │   │   ├── clases.js
│   │   │   ├── matriculas.js
│   │   │   ├── tareas.js
│   │   │   ├── entregas.js
│   │   │   ├── notas.js
│   │   │   ├── asistencia.js
│   │   │   ├── comentarios.js
│   │   │   └── notificaciones.js
│   │   ├── services/
│   │   │   └── notificacionService.js  # Creación masiva de notificaciones
│   │   └── server.js              # Express + SSE + arranque
│   ├── uploads/                   # Archivos subidos (gitignore)
│   ├── .env                       # Variables de entorno
│   └── package.json
│
└── frontend/
    ├── public/
    │   ├── assets/
    │   │   └── logo.png
    │   ├── css/
    │   │   └── main.css           # Design system completo
    │   ├── js/
    │   │   ├── api.js             # Cliente HTTP para todos los endpoints
    │   │   ├── auth.js            # Sesión, token, tema, página activa
    │   │   ├── ui.js              # Toast, Modal, Helpers, Form
    │   │   ├── realtime.js        # SSE + Notificaciones en tiempo real
    │   │   ├── router.js          # SPA router + layout principal
    │   │   ├── app.js             # Bootstrap, rutas, vistas de profesor
    │   │   └── pages/
    │   │       ├── login.js       # Login, registro, recuperar contraseña
    │   │       ├── dashboard.js   # Dashboard por rol
    │   │       ├── clases.js      # Clases (estudiante, profesor, admin)
    │   │       ├── tareas.js      # Tareas, entregas, calificaciones
    │   │       └── otros.js       # Asistencia, notas, usuarios, config
    │   └── index.html             # SPA entry point
    ├── server.js                  # Servidor estático Express
    ├── .env
    └── package.json
```

---

## Base de datos — Tablas

| Tabla | Descripción |
|---|---|
| `usuarios` | Todos los usuarios (estudiante, profesor, administrador) |
| `clases` | Materias/asignaturas con su profesor asignado |
| `matriculas` | Relación estudiante ↔ clase |
| `tareas` | Tareas publicadas por el profesor con fecha límite |
| `entregas` | Archivos entregados por estudiantes |
| `notas` | Calificaciones (actividad, parcial, asistencia) |
| `asistencia` | Registro diario: presente / ausente / excusa |
| `comentarios` | Retroalimentación en entregas |
| `notificaciones` | Campana de avisos en tiempo real |
| `alertas_academicas` | Historial de alertas por riesgo (evita spam) |

### Fórmula de promedio
```
Promedio = (avg_actividades × 0.40) + (avg_parciales × 0.40) + (nota_asistencia × 0.20)
```
La nota de asistencia: presente=1, excusa=0.5, ausente=0 → escala 0–5.

---

## Paso a paso para ejecutar

### 1 — Requisitos previos
- Node.js 18+ instalado
- Cuenta en [supabase.com](https://supabase.com)
- Proyecto SATRA ya creado en Supabase (o crear uno nuevo)

### 2 — Obtener la Service Role Key de Supabase

1. Entra a tu proyecto en Supabase
2. Ve a **Settings → API**
3. Copia la clave **service_role** (empieza con `eyJ...`)

### 3 — Configurar el backend

Abre `backend/.env` y completa:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

SUPABASE_URL=https://wxudzaxqmnymfjjcrxqu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=TU_SERVICE_ROLE_KEY_AQUI   ← CAMBIA ESTO

JWT_SECRET=satra_jwt_secret_cul_2024_very_secure_key_change_in_production
JWT_EXPIRES_IN=7d

# Email (opcional para pruebas locales — usar Gmail con App Password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=tucorreo@gmail.com
EMAIL_PASS=tu_app_password
EMAIL_FROM=SATRA CUL <tucorreo@gmail.com>
```

### 4 — Instalar dependencias e iniciar

**Terminal 1 — Backend:**
```bash
cd satra/backend
npm install
npm start
# → Backend corriendo en http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd satra/frontend
npm install
npm start
# → Frontend corriendo en http://localhost:3000
```

### 5 — Abrir la app

Navega a: **http://localhost:3000**

**Credenciales del administrador inicial:**
```
Email:      admin@satra.cul.edu.co
Contraseña: Admin2024*
```

### 6 — Flujo recomendado para probar

1. **Admin** entra y crea una clase (Clases → Nueva clase)
2. **Admin** crea un profesor (Usuarios → Nuevo usuario, rol: profesor)
3. **Admin** asigna el profesor a la clase
4. **Admin** crea un estudiante (Usuarios → Nuevo usuario, rol: estudiante)
5. **Admin** matricula al estudiante (Matrículas)
6. **Profesor** entra con su cuenta y crea una tarea en su clase
7. **Estudiante** entra y entrega la tarea
8. **Profesor** califica la entrega → si promedio ≤ 2.9, se genera alerta automática

---

## API REST — Resumen de endpoints

```
POST   /api/auth/login
POST   /api/auth/registro
POST   /api/auth/recuperar-password
POST   /api/auth/resetear-password
GET    /api/auth/me
PUT    /api/auth/configuracion
PUT    /api/auth/cambiar-password

GET    /api/usuarios           (admin)
POST   /api/usuarios           (admin)
PUT    /api/usuarios/:id
DELETE /api/usuarios/:id       (admin → desactiva)

GET    /api/clases
POST   /api/clases             (admin)
PUT    /api/clases/:id         (admin/profesor)
DELETE /api/clases/:id         (admin)
GET    /api/clases/:id/estudiantes

GET    /api/matriculas/mis-clases
POST   /api/matriculas         (estudiante)
POST   /api/matriculas/admin   (admin/profesor)

GET    /api/tareas/clase/:id
POST   /api/tareas             (multipart - profesor)
PUT    /api/tareas/:id         (multipart)
DELETE /api/tareas/:id

GET    /api/entregas/tarea/:id
POST   /api/entregas           (multipart - estudiante)
PUT    /api/entregas/:id       (multipart)

GET    /api/notas/clase/:id
GET    /api/notas/clase/:id/estudiante/:id
POST   /api/notas              (profesor)
PUT    /api/notas/:id
DELETE /api/notas/:id

GET    /api/asistencia/clase/:id
POST   /api/asistencia         (individual)
POST   /api/asistencia/masiva  (toda la clase)

GET    /api/notificaciones
PUT    /api/notificaciones/leer-todas
PUT    /api/notificaciones/:id/leer

GET    /api/eventos/:usuario_id   ← SSE tiempo real
```

---

## Roles y permisos

| Acción | Estudiante | Profesor | Admin |
|--------|-----------|----------|-------|
| Ver sus clases | ✓ | ✓ (sus clases) | ✓ (todas) |
| Matricularse | ✓ | — | ✓ |
| Crear/editar clases | — | editar solo las suyas | ✓ |
| Crear tareas | — | ✓ sus clases | ✓ |
| Entregar tareas | ✓ | — | — |
| Registrar notas | — | ✓ sus clases | ✓ |
| Registrar asistencia | — | ✓ sus clases | ✓ |
| Ver sus propias notas | ✓ | — | ✓ |
| Gestionar usuarios | — | — | ✓ |
| Ver alertas académicas | — | ✓ sus clases | ✓ todas |

---

## Despliegue en producción

### Backend en Railway / Render
1. Subir carpeta `backend/` a un repositorio Git
2. Configurar las variables de entorno en el panel de la plataforma
3. Comando de start: `node src/server.js`
4. Cambiar `NODE_ENV=production` y actualizar `FRONTEND_URL`

### Frontend en Vercel / Netlify
1. Subir carpeta `frontend/public/` directamente como sitio estático
2. Actualizar la constante `API_URL` en `public/js/api.js` al dominio del backend

### Variables críticas para producción
```env
NODE_ENV=production
JWT_SECRET=clave_aleatoria_muy_larga_y_segura_min_64_chars
FRONTEND_URL=https://tu-dominio.com
SUPABASE_SERVICE_KEY=service_role_key_real
```

---

## Seguridad implementada

- Contraseñas hasheadas con **bcrypt** (rounds=10)
- Autenticación por **JWT** (7 días de vida)
- **Helmet.js** para headers HTTP seguros
- **Rate limiting**: 200 req/15min general, 20 req/15min en auth
- **RLS (Row Level Security)** en todas las tablas de Supabase
- **Validación** en frontend y backend
- Archivos subidos: whitelist de tipos MIME, máximo 10MB
- **CORS** restringido al dominio del frontend
- Tokens de recuperación expiran en 1 hora
- Anti-spam: alertas académicas máximo 1 cada 24h por materia
