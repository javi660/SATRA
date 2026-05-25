const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { enviarEmail, emailRecuperacion } = require('../config/email');
const crypto = require('crypto');

const generarToken = (usuario) => {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('activo', true)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await supabase
      .from('usuarios')
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq('id', usuario.id);

    const token = generarToken(usuario);

    // No enviar datos sensibles
    const { password_hash, reset_token, reset_token_expira, ...usuarioSeguro } = usuario;

    res.json({
      ok: true,
      token,
      usuario: usuarioSeguro
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/auth/registro
const registro = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, telefono, codigo_estudiantil } = req.body;
    const emailNorm = email.toLowerCase().trim();

    // Verificar si ya existe
    const { data: existe } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', emailNorm)
      .single();

    if (existe) {
      return res.status(409).json({ error: 'Ya existe una cuenta con este email' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data: nuevoUsuario, error } = await supabase
      .from('usuarios')
      .insert({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: emailNorm,
        password_hash,
        rol,
        telefono: telefono || null,
        codigo_estudiantil: codigo_estudiantil || null
      })
      .select('id, nombre, apellido, email, rol, activo, tema, tamano_texto, ultima_pagina')
      .single();

    if (error) {
      console.error('Error creando usuario:', error);
      return res.status(500).json({ error: 'Error al crear la cuenta' });
    }

    const token = generarToken(nuevoUsuario);

    res.status(201).json({
      ok: true,
      token,
      usuario: nuevoUsuario
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/auth/recuperar-password
const solicitarRecuperacion = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre, email')
      .eq('email', email.toLowerCase().trim())
      .eq('activo', true)
      .single();

    // Responder igual aunque no exista (seguridad)
    if (!usuario) {
      return res.json({ ok: true, mensaje: 'Si el correo existe, recibirás un código de recuperación' });
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase
      .from('usuarios')
      .update({ reset_token: token, reset_token_expira: expira })
      .eq('id', usuario.id);

    const emailData = emailRecuperacion(usuario.nombre, token);
    await enviarEmail({ to: usuario.email, ...emailData });

    res.json({ ok: true, mensaje: 'Si el correo existe, recibirás un código de recuperación' });
  } catch (err) {
    console.error('Error en recuperación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/auth/resetear-password
const resetearPassword = async (req, res) => {
  try {
    const { email, token, nueva_password } = req.body;

    if (!email || !token || !nueva_password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    if (nueva_password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, reset_token, reset_token_expira')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (!usuario || usuario.reset_token !== token) {
      return res.status(400).json({ error: 'Código de recuperación inválido' });
    }

    if (new Date(usuario.reset_token_expira) < new Date()) {
      return res.status(400).json({ error: 'El código de recuperación ha expirado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(nueva_password, salt);

    await supabase
      .from('usuarios')
      .update({ password_hash, reset_token: null, reset_token_expira: null })
      .eq('id', usuario.id);

    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error resetando password:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GET /api/auth/me
const perfil = async (req, res) => {
  try {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, foto_perfil, telefono, codigo_estudiantil, tema, tamano_texto, ultima_pagina, ultimo_acceso, created_at')
      .eq('id', req.usuario.id)
      .single();

    res.json({ ok: true, usuario });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// PUT /api/auth/actualizar-pagina
const actualizarPagina = async (req, res) => {
  try {
    const { pagina } = req.body;
    await supabase
      .from('usuarios')
      .update({ ultima_pagina: pagina })
      .eq('id', req.usuario.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
};

// PUT /api/auth/configuracion
const actualizarConfiguracion = async (req, res) => {
  try {
    const { tema, tamano_texto } = req.body;
    const updates = {};
    if (tema && ['claro', 'oscuro'].includes(tema)) updates.tema = tema;
    if (tamano_texto && ['pequeno', 'normal', 'grande'].includes(tamano_texto)) updates.tamano_texto = tamano_texto;

    await supabase.from('usuarios').update(updates).eq('id', req.usuario.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
};

// PUT /api/auth/cambiar-password
const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, nueva_password } = req.body;

    if (!password_actual || !nueva_password) {
      return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    }
    if (nueva_password.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('password_hash')
      .eq('id', req.usuario.id)
      .single();

    const valido = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!valido) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(nueva_password, salt);

    await supabase.from('usuarios').update({ password_hash }).eq('id', req.usuario.id);

    res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
};

module.exports = {
  login,
  registro,
  solicitarRecuperacion,
  resetearPassword,
  perfil,
  actualizarPagina,
  actualizarConfiguracion,
  cambiarPassword
};
