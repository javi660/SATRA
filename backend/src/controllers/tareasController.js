const { supabase } = require('../config/supabase');
const { crearNotificacionMasiva } = require('../services/notificacionService');
const path = require('path');
const fs = require('fs');

// GET /api/tareas/clase/:clase_id
const tareasDeClase = async (req, res) => {
  try {
    const { clase_id } = req.params;

    // Verificar acceso del usuario a la clase
    if (req.usuario.rol === 'estudiante') {
      const { data: m } = await supabase.from('matriculas').select('id').eq('estudiante_id', req.usuario.id).eq('clase_id', clase_id).eq('activa', true).single();
      if (!m) return res.status(403).json({ error: 'No estás matriculado en esta clase' });
    }

    const { data, error } = await supabase
      .from('tareas')
      .select('*')
      .eq('clase_id', clase_id)
      .order('fecha_limite', { ascending: true, nullsFirst: false });

    if (error) throw error;

    // Si es estudiante, agregar estado de entrega para cada tarea
    if (req.usuario.rol === 'estudiante') {
      const tareaIds = data.map(t => t.id);
      const { data: entregas } = tareaIds.length > 0
        ? await supabase.from('entregas').select('tarea_id, fecha_entrega, tardio, archivo_nombre').eq('estudiante_id', req.usuario.id).in('tarea_id', tareaIds)
        : { data: [] };

      const entregasMap = {};
      (entregas || []).forEach(e => { entregasMap[e.tarea_id] = e; });

      const tareasConEstado = data.map(t => ({
        ...t,
        entrega: entregasMap[t.id] || null
      }));

      return res.json({ ok: true, tareas: tareasConEstado });
    }

    res.json({ ok: true, tareas: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
};

// GET /api/tareas/:id
const obtenerTarea = async (req, res) => {
  try {
    const { data, error } = await supabase.from('tareas').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json({ ok: true, tarea: data });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
};

// POST /api/tareas
const crearTarea = async (req, res) => {
  try {
    const { clase_id, titulo, descripcion, tipo, porcentaje, fecha_limite, bloquear_entrega } = req.body;

    if (!clase_id || !titulo || !tipo || !porcentaje) {
      return res.status(400).json({ error: 'clase_id, titulo, tipo y porcentaje son requeridos' });
    }

    // Verificar que el profesor es dueño de la clase
    if (req.usuario.rol === 'profesor') {
      const { data: clase } = await supabase.from('clases').select('profesor_id').eq('id', clase_id).single();
      if (!clase || clase.profesor_id !== req.usuario.id) {
        return res.status(403).json({ error: 'No tienes permiso para crear tareas en esta clase' });
      }
    }

    const archivo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const archivo_nombre = req.file ? req.file.originalname : null;

    const { data, error } = await supabase
      .from('tareas')
      .insert({
        clase_id, titulo, descripcion,
        tipo, porcentaje: parseFloat(porcentaje),
        fecha_limite: fecha_limite || null,
        bloquear_entrega: bloquear_entrega === 'true' || bloquear_entrega === true,
        archivo_url, archivo_nombre,
        created_by: req.usuario.id
      })
      .select()
      .single();

    if (error) throw error;

    // Notificar a estudiantes matriculados
    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('estudiante_id')
      .eq('clase_id', clase_id)
      .eq('activa', true);

    const { data: clase } = await supabase.from('clases').select('nombre').eq('id', clase_id).single();

    if (matriculas && matriculas.length > 0) {
      const ids = matriculas.map(m => m.estudiante_id);
      await crearNotificacionMasiva(ids, {
        tipo: 'nueva_tarea',
        titulo: 'Nueva tarea publicada',
        mensaje: `Se publicó "${titulo}" en ${clase?.nombre || 'tu clase'}`,
        referencia_id: data.id,
        referencia_tipo: 'tarea'
      });
    }

    res.status(201).json({ ok: true, tarea: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear tarea' });
  }
};

// PUT /api/tareas/:id
const actualizarTarea = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tarea } = await supabase.from('tareas').select('*, clase:clases(profesor_id, nombre)').eq('id', id).single();
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    if (req.usuario.rol === 'profesor' && tarea.clase?.profesor_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta tarea' });
    }

    const { titulo, descripcion, porcentaje, fecha_limite, bloquear_entrega } = req.body;
    const updates = {};
    if (titulo) updates.titulo = titulo;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (porcentaje) updates.porcentaje = parseFloat(porcentaje);
    if (fecha_limite !== undefined) updates.fecha_limite = fecha_limite || null;
    if (bloquear_entrega !== undefined) updates.bloquear_entrega = bloquear_entrega === 'true' || bloquear_entrega === true;

    if (req.file) {
      updates.archivo_url = `/uploads/${req.file.filename}`;
      updates.archivo_nombre = req.file.originalname;
    }

    const { data, error } = await supabase.from('tareas').update(updates).eq('id', id).select().single();
    if (error) throw error;

    // Notificar cambio a estudiantes
    const { data: matriculas } = await supabase.from('matriculas').select('estudiante_id').eq('clase_id', tarea.clase_id).eq('activa', true);
    if (matriculas && matriculas.length > 0) {
      await crearNotificacionMasiva(matriculas.map(m => m.estudiante_id), {
        tipo: 'cambio_tarea',
        titulo: 'Tarea actualizada',
        mensaje: `"${data.titulo}" en ${tarea.clase?.nombre || 'tu clase'} ha sido modificada`,
        referencia_id: id,
        referencia_tipo: 'tarea'
      });
    }

    res.json({ ok: true, tarea: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
};

// DELETE /api/tareas/:id
const eliminarTarea = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: tarea } = await supabase.from('tareas').select('*, clase:clases(profesor_id)').eq('id', id).single();
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });

    if (req.usuario.rol === 'profesor' && tarea.clase?.profesor_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    // Eliminar archivo si existe
    if (tarea.archivo_url) {
      const filePath = path.join(process.env.UPLOAD_PATH || './uploads', path.basename(tarea.archivo_url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const { error } = await supabase.from('tareas').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true, mensaje: 'Tarea eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar tarea' });
  }
};

module.exports = { tareasDeClase, obtenerTarea, crearTarea, actualizarTarea, eliminarTarea };
