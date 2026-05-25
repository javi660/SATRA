const { supabase } = require('../config/supabase');

// GET /api/clases
const listarClases = async (req, res) => {
  try {
    const { usuario } = req;
    let query = supabase
      .from('clases')
      .select(`
        *,
        profesor:usuarios!clases_profesor_id_fkey(id, nombre, apellido, email)
      `)
      .order('created_at', { ascending: false });

    if (usuario.rol === 'profesor') {
      query = query.eq('profesor_id', usuario.id);
    } else if (usuario.rol === 'estudiante') {
      // Obtener las clases en que está matriculado
      const { data: matriculas } = await supabase
        .from('matriculas')
        .select('clase_id')
        .eq('estudiante_id', usuario.id)
        .eq('activa', true);

      const claseIds = (matriculas || []).map(m => m.clase_id);
      if (claseIds.length === 0) return res.json({ ok: true, clases: [] });
      query = query.in('id', claseIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ ok: true, clases: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clases' });
  }
};

// GET /api/clases/disponibles (para matricularse - solo estudiantes)
const clasesDisponibles = async (req, res) => {
  try {
    const { data: matriculadas } = await supabase
      .from('matriculas')
      .select('clase_id')
      .eq('estudiante_id', req.usuario.id)
      .eq('activa', true);

    const idsMatriculadas = (matriculadas || []).map(m => m.clase_id);

    let query = supabase
      .from('clases')
      .select(`*, profesor:usuarios!clases_profesor_id_fkey(id, nombre, apellido)`)
      .eq('activa', true)
      .order('nombre');

    if (idsMatriculadas.length > 0) {
      query = query.not('id', 'in', `(${idsMatriculadas.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ ok: true, clases: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clases disponibles' });
  }
};

// GET /api/clases/:id
const obtenerClase = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('clases')
      .select(`*, profesor:usuarios!clases_profesor_id_fkey(id, nombre, apellido, email)`)
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Clase no encontrada' });

    // Verificar acceso
    if (req.usuario.rol === 'profesor' && data.profesor_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes acceso a esta clase' });
    }
    if (req.usuario.rol === 'estudiante') {
      const { data: matricula } = await supabase
        .from('matriculas')
        .select('id')
        .eq('estudiante_id', req.usuario.id)
        .eq('clase_id', id)
        .eq('activa', true)
        .single();
      if (!matricula) return res.status(403).json({ error: 'No estás matriculado en esta clase' });
    }

    res.json({ ok: true, clase: data });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
};

// POST /api/clases - admin
const crearClase = async (req, res) => {
  try {
    const { nombre, descripcion, codigo, creditos, semestre, anio, profesor_id } = req.body;

    if (!nombre || !codigo) {
      return res.status(400).json({ error: 'Nombre y código son requeridos' });
    }

    const { data: existe } = await supabase.from('clases').select('id').eq('codigo', codigo.trim()).single();
    if (existe) return res.status(409).json({ error: 'Ya existe una clase con este código' });

    const { data, error } = await supabase
      .from('clases')
      .insert({ nombre, descripcion, codigo: codigo.trim().toUpperCase(), creditos, semestre, anio, profesor_id })
      .select(`*, profesor:usuarios!clases_profesor_id_fkey(id, nombre, apellido)`)
      .single();

    if (error) throw error;
    res.status(201).json({ ok: true, clase: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear clase' });
  }
};

// PUT /api/clases/:id
const actualizarClase = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, creditos, semestre, anio, profesor_id, activa } = req.body;

    // Profesores solo pueden editar sus propias clases
    if (req.usuario.rol === 'profesor') {
      const { data: clase } = await supabase.from('clases').select('profesor_id').eq('id', id).single();
      if (!clase || clase.profesor_id !== req.usuario.id) {
        return res.status(403).json({ error: 'No puedes editar esta clase' });
      }
    }

    const updates = {};
    if (nombre) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (creditos) updates.creditos = creditos;
    if (semestre) updates.semestre = semestre;
    if (anio) updates.anio = anio;
    if (req.usuario.rol === 'administrador') {
      if (profesor_id !== undefined) updates.profesor_id = profesor_id;
      if (activa !== undefined) updates.activa = activa;
    }

    const { data, error } = await supabase
      .from('clases')
      .update(updates)
      .eq('id', id)
      .select(`*, profesor:usuarios!clases_profesor_id_fkey(id, nombre, apellido)`)
      .single();

    if (error) throw error;
    res.json({ ok: true, clase: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar clase' });
  }
};

// DELETE /api/clases/:id - solo admin
const eliminarClase = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('clases').update({ activa: false }).eq('id', id);
    if (error) throw error;
    res.json({ ok: true, mensaje: 'Clase desactivada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar clase' });
  }
};

// GET /api/clases/:id/estudiantes
const estudiantesDeClase = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('matriculas')
      .select(`
        id,
        fecha_matricula,
        estudiante:usuarios!matriculas_estudiante_id_fkey(id, nombre, apellido, email, codigo_estudiantil)
      `)
      .eq('clase_id', id)
      .eq('activa', true);

    if (error) throw error;
    res.json({ ok: true, estudiantes: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estudiantes' });
  }
};

module.exports = { listarClases, clasesDisponibles, obtenerClase, crearClase, actualizarClase, eliminarClase, estudiantesDeClase };
