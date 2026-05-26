require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================
// SEGURIDAD
// =============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://fantastic-mindfulness-production-ac20.up.railway.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas peticiones, intenta en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de autenticación, intenta en 15 minutos' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/recuperar-password', authLimiter);

// =============================================
// BODY PARSERS
// =============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================
// ARCHIVOS ESTÁTICOS
// =============================================
const uploadPath = process.env.UPLOAD_PATH || './uploads';
app.use('/uploads', express.static(path.resolve(uploadPath)));

// =============================================
// RUTAS API
// =============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/clases', require('./routes/clases'));
app.use('/api/matriculas', require('./routes/matriculas'));
app.use('/api/tareas', require('./routes/tareas'));
app.use('/api/entregas', require('./routes/entregas'));
app.use('/api/notas', require('./routes/notas'));
app.use('/api/asistencia', require('./routes/asistencia'));
app.use('/api/comentarios', require('./routes/comentarios'));
app.use('/api/notificaciones', require('./routes/notificaciones'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', service: 'SATRA API', timestamp: new Date().toISOString() });
});

// =============================================
// REALTIME SSE (Server-Sent Events)
// =============================================
const clientes = new Map();

app.get('/api/eventos/:usuario_id', (req, res) => {
  const { usuario_id } = req.params;
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.flushHeaders();

  const clientId = `${usuario_id}_${Date.now()}`;
  if (!clientes.has(usuario_id)) clientes.set(usuario_id, new Map());
  clientes.get(usuario_id).set(clientId, res);

  res.write(`data: ${JSON.stringify({ tipo: 'conectado', mensaje: 'Conectado a SATRA en tiempo real' })}\n\n`);

  // Heartbeat cada 25 segundos para mantener conexión
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    if (clientes.has(usuario_id)) {
      clientes.get(usuario_id).delete(clientId);
      if (clientes.get(usuario_id).size === 0) clientes.delete(usuario_id);
    }
  });
});

// Función global para emitir eventos a usuario(s)
app.locals.emitirEvento = (usuario_id, evento) => {
  if (clientes.has(usuario_id)) {
    const msg = `data: ${JSON.stringify(evento)}\n\n`;
    clientes.get(usuario_id).forEach(res => res.write(msg));
  }
};

app.locals.emitirEventoMasivo = (usuario_ids, evento) => {
  usuario_ids.forEach(id => app.locals.emitirEvento(id, evento));
};

// =============================================
// SUPABASE REALTIME - escuchar cambios y propagar
// =============================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseAnonKey) {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseRT = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY);

  supabaseRT
    .channel('notificaciones-nuevas')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
      const notif = payload.new;
      app.locals.emitirEvento(notif.usuario_id, {
        tipo: 'nueva_notificacion',
        notificacion: notif
      });
    })
    .subscribe();
}

// =============================================
// MANEJO DE ERRORES
// =============================================
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// =============================================
// INICIAR SERVIDOR
// =============================================
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  SATRA Backend corriendo en puerto ${PORT}`);
  console.log(`  Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log(`========================================\n`);
});

module.exports = app;