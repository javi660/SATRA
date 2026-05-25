const { supabase } = require('../config/supabase');

const crearNotificacion = async (usuario_id, { tipo, titulo, mensaje, referencia_id, referencia_tipo }) => {
  try {
    const { error } = await supabase.from('notificaciones').insert({
      usuario_id, tipo, titulo, mensaje,
      referencia_id: referencia_id || null,
      referencia_tipo: referencia_tipo || null
    });
    if (error) console.error('Error creando notificación:', error.message);
  } catch (err) {
    console.error('Error en notificacionService:', err.message);
  }
};

const crearNotificacionMasiva = async (usuario_ids, { tipo, titulo, mensaje, referencia_id, referencia_tipo }) => {
  try {
    if (!usuario_ids || usuario_ids.length === 0) return;
    const inserts = usuario_ids.map(uid => ({
      usuario_id: uid, tipo, titulo, mensaje,
      referencia_id: referencia_id || null,
      referencia_tipo: referencia_tipo || null
    }));
    const { error } = await supabase.from('notificaciones').insert(inserts);
    if (error) console.error('Error en notificación masiva:', error.message);
  } catch (err) {
    console.error('Error en crearNotificacionMasiva:', err.message);
  }
};

module.exports = { crearNotificacion, crearNotificacionMasiva };
