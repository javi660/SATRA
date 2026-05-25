const { supabase } = require('../config/supabase');
const path = require('path');
const fs = require('fs');

// GET /api/entregas/tarea/:tarea_id
const entregasDeTarea = async (req, res) => {
  try {
    const { tarea_id } = req.params;

    const { data: tarea } = await supabase.from('tareas').select('*, clase:clases(profesor_id)').eq('id', tarea_id).single();
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    // Profesor solo ve su clase
    if (req.usuario.rol === 'profesor' && tarea.clase?.profesor_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes acceso a esta tarea' });
    }

    // Estudiante solo ve su propia entrega
    if (req.usuario.rol === 'estudiante') {
      const { data, error } = await supabase
        .from('entregas')
        .select('*, comentarios(*, autor:usuarios!comentarios_autor_id_fkey(id, nombre, apellido, rol))')
        .eq('tarea_id', tarea_id)
        .eq('estudiante_id', req.usuario.id)
        .single();

      return res.json({ ok: true, entrega: data || null });
    }

    // Profesor/Admin ven todas
    const { data, error } = await supabase
      .from('entregas')
      .select(`
        *,
        estudiante:usuarios!entregas_estudiante_id_fkey(id, nombre, apellido, email, codigo_estudiantil),
        comentarios(*, autor:usuarios!comentarios_autor_id_fkey(id, nombre, apellido, rol))
      `)
      .eq('tarea_id', tarea_id)
      .order('fecha_entrega');

    if (error) throw error;

    // Agregar "no entregó" para estudiantes matriculados sin entrega
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('estudiante:usuarios!matriculas_estudiante_id_fkey(id, nombre, apellido, email, codigo_estudiantil)')
      .eq('clase_id', tarea.clase_id)
      .eq('activa', true);

    const entregasMap = {};
    (data || []).forEach(e => { entregasMap[e.estudiante_id] = e; });

    const resultado = (matriculas || []).map(m => {
      const est = m.estudiante;
      return entregasMap[est.id] || {
        id: null,
        tarea_id,
        estudiante_id: est.id,
        estudiante: est,
        archivo_url: null,
        archivo_nombre: null,
        comentario_estudiante: null,
        tardio: false,
        fecha_entrega: null,
        no_entrego: true
      };
    });

    res.json({ ok: true, entregas: resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener entregas' });
  }
};

// POST /api/entregas
const crearEntrega = async (req, res) => {
  try {
    const { tarea_id, comentario_estudiante } = req.body;
    const estudiante_id = req.usuario.id;

    if (!tarea_id) return res.status(400).json({ error: 'tarea_id es requerido' });

    const { data: tarea } = await supabase.from('tareas').select('*').eq('id', tarea_id).single();
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    // Verificar si el tiempo límite está bloqueado
    if (tarea.bloquear_entrega && tarea.fecha_limite && new Date() > new Date(tarea.fecha_limite)) {
      return res.status(403).json({ error: 'El plazo de entrega ha vencido y las entregas están bloqueadas' });
    }

    // Verificar matrícula
    const { data: matricula } = await supabase
      .from('matriculas')
      .select('id')
      .eq('estudiante_id', estudiante_id)
      .eq('clase_id', tarea.clase_id)
      .eq('activa', true)
      .single();
    if (!matricula) return res.status(403).json({ error: 'No estás matriculado en esta clase' });

    const { data: existeEntrega } = await supabase
      .from('entregas')
      .select('id')
      .eq('tarea_id', tarea_id)
      .eq('estudiante_id', estudiante_id)
      .single();

    if (existeEntrega) return res.status(409).json({ error: 'Ya existe una entrega para esta tarea. Usa PUT para actualizarla.' });

    const archivo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const archivo_nombre = req.file ? req.file.originalname : null;

    const { data, error } = await supabase
      .from('entregas')
      .insert({ tarea_id, estudiante_id, archivo_url, archivo_nombre, comentario_estudiante })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ ok: true, entrega: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear entrega' });
  }
};

// PUT /api/entregas/:id
const actualizarEntrega = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentario_estudiante } = req.body;

    const { data: entrega } = await supabase.from('entregas').select('*, tarea:tareas(bloquear_entrega, fecha_limite)').eq('id', id).single();
    if (!entrega) return res.status(404).json({ error: 'Entrega no encontrada' });

    // Solo el dueño puede editar su entrega
    if (entrega.estudiante_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No puedes editar la entrega de otro estudiante' });
    }

    // Verificar si está bloqueada
    if (entrega.tarea?.bloquear_entrega && entrega.tarea?.fecha_limite && new Date() > new Date(entrega.tarea.fecha_limite)) {
      return res.status(403).json({ error: 'El plazo de entrega ha vencido y las entregas están bloqueadas' });
    }

    const updates = {};
    if (comentario_estudiante !== undefined) updates.comentario_estudiante = comentario_estudiante;
    if (req.file) {
      updates.archivo_url = `/uploads/${req.file.filename}`;
      updates.archivo_nombre = req.file.originalname;
    }

    const { data, error } = await supabase.from('entregas').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json({ ok: true, entrega: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar entrega' });
  }
};

module.exports = { entregasDeTarea, crearEntrega, actualizarEntrega };
