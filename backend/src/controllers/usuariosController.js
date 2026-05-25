const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');

const listarUsuarios = async (req, res) => {
  try {
    const { rol, activo, buscar } = req.query;
    let query = supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, telefono, codigo_estudiantil, ultimo_acceso, created_at')
      .order('created_at', { ascending: false });

    if (rol) query = query.eq('rol', rol);
    if (activo !== undefined) query = query.eq('activo', activo === 'true');
    if (buscar) query = query.or(`nombre.ilike.%${buscar}%,apellido.ilike.%${buscar}%,email.ilike.%${buscar}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ ok: true, usuarios: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.usuario.rol !== 'administrador' && req.usuario.id !== id) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email, rol, activo, foto_perfil, telefono, codigo_estudiantil, tema, tamano_texto, ultimo_acceso, created_at')
      .eq('id', id)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true, usuario: data });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol, telefono, codigo_estudiantil } = req.body;
    if (!nombre || !apellido || !email || !password || !rol) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }
    const emailNorm = email.toLowerCase().trim();
    const { data: existe } = await supabase.from('usuarios').select('id').eq('email', emailNorm).single();
    if (existe) return res.status(409).json({ error: 'Email ya registrado' });

    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from('usuarios')
      .insert({ nombre, apellido, email: emailNorm, password_hash, rol, telefono, codigo_estudiantil })
      .select('id, nombre, apellido, email, rol, activo, created_at')
      .single();
    if (error) throw error;
    res.status(201).json({ ok: true, usuario: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.usuario.rol !== 'administrador' && req.usuario.id !== id) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    const { nombre, apellido, telefono, codigo_estudiantil, activo } = req.body;
    const updates = {};
    if (nombre) updates.nombre = nombre.trim();
    if (apellido) updates.apellido = apellido.trim();
    if (telefono !== undefined) updates.telefono = telefono;
    if (codigo_estudiantil !== undefined) updates.codigo_estudiantil = codigo_estudiantil;
    if (req.usuario.rol === 'administrador' && activo !== undefined) updates.activo = activo;

    const { data, error } = await supabase
      .from('usuarios').update(updates).eq('id', id)
      .select('id, nombre, apellido, email, rol, activo, telefono, codigo_estudiantil')
      .single();
    if (error) throw error;
    res.json({ ok: true, usuario: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Desactiva: bloquea acceso pero conserva todos los datos
const desactivarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    }
    const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true, mensaje: 'Usuario desactivado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
};

// Elimina: borra completamente, cascada en BD elimina relaciones
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true, mensaje: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al eliminar usuario' });
  }
};

const listarProfesores = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido, email')
      .eq('rol', 'profesor').eq('activo', true).order('nombre');
    if (error) throw error;
    res.json({ ok: true, profesores: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener profesores' });
  }
};

module.exports = { listarUsuarios, obtenerUsuario, crearUsuario, actualizarUsuario, desactivarUsuario, eliminarUsuario, listarProfesores };
