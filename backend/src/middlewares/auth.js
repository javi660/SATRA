const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const verificarToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Verificar que el usuario siga activo en BD
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, tema, tamano_texto, ultima_pagina')
      .eq('id', payload.id)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    console.error('Error en middleware auth:', err);
    return res.status(500).json({ error: 'Error interno de autenticación' });
  }
};

const requiereRol = (...roles) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}` });
    }
    next();
  };
};

module.exports = { verificarToken, requiereRol };
