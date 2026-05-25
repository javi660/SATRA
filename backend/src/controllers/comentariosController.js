const { supabase } = require('../config/supabase');

// GET /api/comentarios/entrega/:entrega_id
const comentariosDeEntrega = async (req, res) => {
  try {
    const { entrega_id } = req.params;
    const { data, error } = await supabase
      .from('comentarios')
      .select('*, autor:usuarios!comentarios_autor_id_fkey(id, nombre, apellido, rol)')
      .eq('entrega_id', entrega_id)
      .order('created_at');

    if (error) throw error;
    res.json({ ok: true, comentarios: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
};

// POST /api/comentarios
const crearComentario = async (req, res) => {
  try {
    const { entrega_id, contenido } = req.body;

    if (!entrega_id || !contenido?.trim()) {
      return res.status(400).json({ error: 'entrega_id y contenido son requeridos' });
    }

    const { data, error } = await supabase
      .from('comentarios')
      .insert({ entrega_id, autor_id: req.usuario.id, contenido: contenido.trim() })
      .select('*, autor:usuarios!comentarios_autor_id_fkey(id, nombre, apellido, rol)')
      .single();

    if (error) throw error;
    res.status(201).json({ ok: true, comentario: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear comentario' });
  }
};

// PUT /api/comentarios/:id
const editarComentario = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;

    if (!contenido?.trim()) return res.status(400).json({ error: 'Contenido requerido' });

    const { data: comentario } = await supabase.from('comentarios').select('autor_id').eq('id', id).single();
    if (!comentario) return res.status(404).json({ error: 'Comentario no encontrado' });

    if (comentario.autor_id !== req.usuario.id) {
      return res.status(403).json({ error: 'Solo puedes editar tus propios comentarios' });
    }

    const { data, error } = await supabase
      .from('comentarios')
      .update({ contenido: contenido.trim(), editado: true })
      .eq('id', id)
      .select('*, autor:usuarios!comentarios_autor_id_fkey(id, nombre, apellido, rol)')
      .single();

    if (error) throw error;
    res.json({ ok: true, comentario: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al editar comentario' });
  }
};

// DELETE /api/comentarios/:id
const eliminarComentario = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: comentario } = await supabase.from('comentarios').select('autor_id').eq('id', id).single();
    if (!comentario) return res.status(404).json({ error: 'Comentario no encontrado' });

    if (comentario.autor_id !== req.usuario.id && req.usuario.rol !== 'administrador') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este comentario' });
    }

    const { error } = await supabase.from('comentarios').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true, mensaje: 'Comentario eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar comentario' });
  }
};

module.exports = { comentariosDeEntrega, crearComentario, editarComentario, eliminarComentario };
