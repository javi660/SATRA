const { supabase } = require('../config/supabase');

// GET /api/asistencia/clase/:clase_id
const asistenciaDeClase = async (req, res) => {
  try {
    const { clase_id } = req.params;
    const { fecha } = req.query;

    if (req.usuario.rol === 'profesor') {
      const { data: clase } = await supabase.from('clases').select('profesor_id').eq('id', clase_id).single();
      if (!clase || clase.profesor_id !== req.usuario.id) {
        return res.status(403).json({ error: 'No tienes acceso a esta clase' });
      }
    }

    let query = supabase
      .from('asistencia')
      .select('*, estudiante:usuarios!asistencia_estudiante_id_fkey(id, nombre, apellido, codigo_estudiantil)')
      .eq('clase_id', clase_id)
      .order('fecha', { ascending: false });

    if (fecha) query = query.eq('fecha', fecha);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ ok: true, asistencia: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener asistencia' });
  }
};

// GET /api/asistencia/clase/:clase_id/estudiante/:estudiante_id
const asistenciaEstudiante = async (req, res) => {
  try {
    const { clase_id, estudiante_id } = req.params;

    if (req.usuario.rol === 'estudiante' && req.usuario.id !== estudiante_id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { data, error } = await supabase
      .from('asistencia')
      .select('*')
      .eq('clase_id', clase_id)
      .eq('estudiante_id', estudiante_id)
      .order('fecha', { ascending: false });

    if (error) throw error;

    // Calcular estadísticas
    const total = data.length;
    const presentes = data.filter(a => a.estado === 'presente').length;
    const ausentes = data.filter(a => a.estado === 'ausente').length;
    const excusas = data.filter(a => a.estado === 'excusa').length;
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

    res.json({ ok: true, asistencia: data, estadisticas: { total, presentes, ausentes, excusas, porcentaje } });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener asistencia' });
  }
};

// POST /api/asistencia - registrar asistencia individual
const registrarAsistencia = async (req, res) => {
  try {
    const { estudiante_id, clase_id, fecha, estado, observacion } = req.body;

    if (!estudiante_id || !clase_id || !fecha || !estado) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    if (!['presente', 'ausente', 'excusa'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Use: presente, ausente o excusa' });
    }

    if (req.usuario.rol === 'profesor') {
      const { data: clase } = await supabase.from('clases').select('profesor_id').eq('id', clase_id).single();
      if (!clase || clase.profesor_id !== req.usuario.id) {
        return res.status(403).json({ error: 'No tienes permiso para registrar asistencia en esta clase' });
      }
    }

    const { data, error } = await supabase
      .from('asistencia')
      .upsert({
        estudiante_id, clase_id,
        fecha,
        estado,
        observacion: observacion || null,
        registrado_por: req.usuario.id
      }, { onConflict: 'estudiante_id,clase_id,fecha' })
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, asistencia: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar asistencia' });
  }
};

// POST /api/asistencia/masiva - registrar asistencia de toda la clase en una fecha
const registrarAsistenciaMasiva = async (req, res) => {
  try {
    const { clase_id, fecha, registros } = req.body;

    if (!clase_id || !fecha || !Array.isArray(registros)) {
      return res.status(400).json({ error: 'clase_id, fecha y registros (array) son requeridos' });
    }

    if (req.usuario.rol === 'profesor') {
      const { data: clase } = await supabase.from('clases').select('profesor_id').eq('id', clase_id).single();
      if (!clase || clase.profesor_id !== req.usuario.id) {
        return res.status(403).json({ error: 'No tienes permiso' });
      }
    }

    const inserts = registros.map(r => ({
      estudiante_id: r.estudiante_id,
      clase_id,
      fecha,
      estado: r.estado,
      observacion: r.observacion || null,
      registrado_por: req.usuario.id
    }));

    const { data, error } = await supabase
      .from('asistencia')
      .upsert(inserts, { onConflict: 'estudiante_id,clase_id,fecha' })
      .select();

    if (error) throw error;
    res.json({ ok: true, registros: data, mensaje: `${data.length} registros de asistencia guardados` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar asistencia masiva' });
  }
};

// GET /api/asistencia/fechas/:clase_id - fechas con asistencia registrada
const fechasConAsistencia = async (req, res) => {
  try {
    const { clase_id } = req.params;
    const { data, error } = await supabase
      .from('asistencia')
      .select('fecha')
      .eq('clase_id', clase_id)
      .order('fecha', { ascending: false });

    if (error) throw error;
    const fechasUnicas = [...new Set(data.map(r => r.fecha))];
    res.json({ ok: true, fechas: fechasUnicas });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener fechas' });
  }
};

module.exports = { asistenciaDeClase, asistenciaEstudiante, registrarAsistencia, registrarAsistenciaMasiva, fechasConAsistencia };
