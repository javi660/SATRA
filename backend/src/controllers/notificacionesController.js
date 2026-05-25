const { supabase } = require('../config/supabase');

// GET /api/notificaciones
const misNotificaciones = async (req, res) => {
  try {
    const { leida, limite } = req.query;
    let query = supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', req.usuario.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limite) || 50);

    if (leida !== undefined) query = query.eq('leida', leida === 'true');

    const { data, error } = await query;
    if (error) throw error;

    const pendientes = data.filter(n => !n.leida).length;
    res.json({ ok: true, notificaciones: data, pendientes });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

// GET /api/notificaciones/pendientes-count
const contarPendientes = async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', req.usuario.id)
      .eq('leida', false);

    if (error) throw error;
    res.json({ ok: true, pendientes: count });
  } catch (err) {
    res.status(500).json({ error: 'Error al contar notificaciones' });
  }
};

// PUT /api/notificaciones/:id/leer
const marcarLeida = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
      .eq('usuario_id', req.usuario.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
};

// PUT /api/notificaciones/leer-todas
const marcarTodasLeidas = async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', req.usuario.id)
      .eq('leida', false);

    if (error) throw error;
    res.json({ ok: true, mensaje: 'Todas las notificaciones marcadas como leídas' });
  } catch (err) {
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
};

// DELETE /api/notificaciones/:id
const eliminarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('id', id)
      .eq('usuario_id', req.usuario.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar notificación' });
  }
};

module.exports = { misNotificaciones, contarPendientes, marcarLeida, marcarTodasLeidas, eliminarNotificacion };
