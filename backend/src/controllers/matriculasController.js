const { supabase } = require('../config/supabase');
const { crearNotificacion } = require('../services/notificacionService');

// POST /api/matriculas
const matricularse = async (req, res) => {
  try {
    const { clase_id } = req.body;
    const estudiante_id = req.usuario.id;

    if (!clase_id) return res.status(400).json({ error: 'clase_id es requerido' });

    // Verificar que la clase existe y está activa
    const { data: clase } = await supabase.from('clases').select('id, nombre, activa').eq('id', clase_id).single();
    if (!clase || !clase.activa) return res.status(404).json({ error: 'Clase no encontrada o inactiva' });

    // Verificar si ya está matriculado
    const { data: yaMatriculado } = await supabase
      .from('matriculas')
      .select('id, activa')
      .eq('estudiante_id', estudiante_id)
      .eq('clase_id', clase_id)
      .single();

    if (yaMatriculado) {
      if (yaMatriculado.activa) return res.status(409).json({ error: 'Ya estás matriculado en esta clase' });
      // Reactivar matrícula
      const { data, error } = await supabase
        .from('matriculas')
        .update({ activa: true })
        .eq('id', yaMatriculado.id)
        .select()
        .single();
      if (error) throw error;
      return res.json({ ok: true, matricula: data });
    }

    const { data, error } = await supabase
      .from('matriculas')
      .insert({ estudiante_id, clase_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ ok: true, matricula: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al matricularse' });
  }
};

// POST /api/matriculas/admin - admin matricula a estudiante
const matricularEstudiante = async (req, res) => {
  try {
    const { estudiante_id, clase_id } = req.body;
    if (!estudiante_id || !clase_id) return res.status(400).json({ error: 'estudiante_id y clase_id son requeridos' });

    const { data: existe } = await supabase
      .from('matriculas')
      .select('id, activa')
      .eq('estudiante_id', estudiante_id)
      .eq('clase_id', clase_id)
      .single();

    if (existe) {
      if (existe.activa) return res.status(409).json({ error: 'El estudiante ya está matriculado' });
      await supabase.from('matriculas').update({ activa: true }).eq('id', existe.id);
      return res.json({ ok: true, mensaje: 'Matrícula reactivada' });
    }

    const { data, error } = await supabase
      .from('matriculas')
      .insert({ estudiante_id, clase_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ ok: true, matricula: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al matricular estudiante' });
  }
};

// DELETE /api/matriculas/:id
const cancelarMatricula = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: matricula } = await supabase.from('matriculas').select('*').eq('id', id).single();
    if (!matricula) return res.status(404).json({ error: 'Matrícula no encontrada' });

    // Solo admin puede cancelar matrículas de otros
    if (req.usuario.rol === 'estudiante' && matricula.estudiante_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta matrícula' });
    }

    const { error } = await supabase.from('matriculas').update({ activa: false }).eq('id', id);
    if (error) throw error;

    res.json({ ok: true, mensaje: 'Matrícula cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar matrícula' });
  }
};

// GET /api/matriculas/mis-clases
const misClases = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('matriculas')
      .select(`
        id,
        fecha_matricula,
        clase:clases(id, nombre, descripcion, codigo, creditos, semestre, anio,
          profesor:usuarios!clases_profesor_id_fkey(id, nombre, apellido))
      `)
      .eq('estudiante_id', req.usuario.id)
      .eq('activa', true);

    if (error) throw error;
    res.json({ ok: true, matriculas: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener matrículas' });
  }
};

module.exports = { matricularse, matricularEstudiante, cancelarMatricula, misClases };
