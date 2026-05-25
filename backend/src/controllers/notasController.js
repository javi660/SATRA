const { supabase } = require('../config/supabase');
const { crearNotificacion } = require('../services/notificacionService');
const { enviarEmail, emailAlertaAcademica } = require('../config/email');

// GET /api/notas/clase/:clase_id/estudiante/:estudiante_id
const notasEstudianteEnClase = async (req, res) => {
  try {
    const { clase_id, estudiante_id } = req.params;

    // Permisos
    if (req.usuario.rol === 'estudiante' && req.usuario.id !== estudiante_id) {
      return res.status(403).json({ error: 'Solo puedes ver tus propias notas' });
    }

    const { data, error } = await supabase
      .from('notas')
      .select('*, tarea:tareas(titulo, tipo)')
      .eq('clase_id', clase_id)
      .eq('estudiante_id', estudiante_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calcular promedio
    const { data: promedioData } = await supabase
      .rpc('calcular_promedio', { p_estudiante_id: estudiante_id, p_clase_id: clase_id });

    res.json({ ok: true, notas: data, promedio: promedioData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener notas' });
  }
};

// GET /api/notas/clase/:clase_id (todas las notas de la clase - para profesor)
const notasDeClase = async (req, res) => {
  try {
    const { clase_id } = req.params;

    if (req.usuario.rol === 'profesor') {
      const { data: clase } = await supabase.from('clases').select('profesor_id').eq('id', clase_id).single();
      if (!clase || clase.profesor_id !== req.usuario.id) {
        return res.status(403).json({ error: 'No tienes acceso a esta clase' });
      }
    }

    const { data: matriculas } = await supabase
      .from('matriculas')
      .select('estudiante:usuarios!matriculas_estudiante_id_fkey(id, nombre, apellido, codigo_estudiantil)')
      .eq('clase_id', clase_id)
      .eq('activa', true);

    const estudiantes = (matriculas || []).map(m => m.estudiante);
    const resultado = [];

    for (const est of estudiantes) {
      const { data: promData } = await supabase.rpc('calcular_promedio', {
        p_estudiante_id: est.id,
        p_clase_id: clase_id
      });
      resultado.push({ ...est, promedio: promData });
    }

    res.json({ ok: true, estudiantes: resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener notas' });
  }
};

// POST /api/notas
const crearNota = async (req, res) => {
  try {
    const { estudiante_id, clase_id, tarea_id, tipo, valor, comentario } = req.body;

    if (!estudiante_id || !clase_id || !tipo || valor === undefined) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum < 0 || valorNum > 5) {
      return res.status(400).json({ error: 'La nota debe ser entre 0.0 y 5.0' });
    }

    // Verificar que el profesor es dueño de la clase
    if (req.usuario.rol === 'profesor') {
      const { data: clase } = await supabase.from('clases').select('profesor_id, nombre').eq('id', clase_id).single();
      if (!clase || clase.profesor_id !== req.usuario.id) {
        return res.status(403).json({ error: 'No tienes permiso para calificar en esta clase' });
      }
    }

    const { data, error } = await supabase
      .from('notas')
      .insert({ estudiante_id, clase_id, tarea_id: tarea_id || null, tipo, valor: valorNum, comentario, created_by: req.usuario.id })
      .select()
      .single();

    if (error) throw error;

    // Notificar al estudiante
    const { data: clase } = await supabase.from('clases').select('nombre').eq('id', clase_id).single();
    await crearNotificacion(estudiante_id, {
      tipo: 'nueva_nota',
      titulo: 'Nueva calificación registrada',
      mensaje: `Se registró una nota de ${valorNum} en ${clase?.nombre}`,
      referencia_id: data.id,
      referencia_tipo: 'nota'
    });

    // Verificar si hay riesgo académico y enviar email
    await verificarYEnviarAlerta(estudiante_id, clase_id, clase?.nombre);

    res.status(201).json({ ok: true, nota: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear nota' });
  }
};

// PUT /api/notas/:id
const actualizarNota = async (req, res) => {
  try {
    const { id } = req.params;
    const { valor, comentario } = req.body;

    const { data: nota } = await supabase.from('notas').select('*, clase:clases(profesor_id)').eq('id', id).single();
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });

    if (req.usuario.rol === 'profesor' && nota.clase?.profesor_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta nota' });
    }

    const updates = {};
    if (valor !== undefined) {
      const v = parseFloat(valor);
      if (isNaN(v) || v < 0 || v > 5) return res.status(400).json({ error: 'Nota inválida' });
      updates.valor = v;
    }
    if (comentario !== undefined) updates.comentario = comentario;

    const { data, error } = await supabase.from('notas').update(updates).eq('id', id).select().single();
    if (error) throw error;

    await verificarYEnviarAlerta(nota.estudiante_id, nota.clase_id, null);

    res.json({ ok: true, nota: data });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar nota' });
  }
};

// DELETE /api/notas/:id
const eliminarNota = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: nota } = await supabase.from('notas').select('*, clase:clases(profesor_id)').eq('id', id).single();
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });

    if (req.usuario.rol === 'profesor' && nota.clase?.profesor_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    const { error } = await supabase.from('notas').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true, mensaje: 'Nota eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar nota' });
  }
};

async function verificarYEnviarAlerta(estudiante_id, clase_id, nombre_clase) {
  try {
    const { data: promedio } = await supabase.rpc('calcular_promedio', {
      p_estudiante_id: estudiante_id,
      p_clase_id: clase_id
    });

    if (promedio <= 2.9) {
      // Verificar si ya se envió alerta en 24h
      const { data: alertaReciente } = await supabase
        .from('alertas_academicas')
        .select('id')
        .eq('estudiante_id', estudiante_id)
        .eq('clase_id', clase_id)
        .gte('fecha_alerta', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!alertaReciente) {
        const { data: estudiante } = await supabase
          .from('usuarios')
          .select('nombre, apellido, email')
          .eq('id', estudiante_id)
          .single();

        if (!nombre_clase) {
          const { data: c } = await supabase.from('clases').select('nombre').eq('id', clase_id).single();
          nombre_clase = c?.nombre;
        }

        // Registrar alerta
        await supabase.from('alertas_academicas').insert({
          estudiante_id, clase_id, promedio_calculado: promedio, email_enviado: true
        });

        // Enviar email
        if (estudiante) {
          const emailData = emailAlertaAcademica(`${estudiante.nombre} ${estudiante.apellido}`, nombre_clase, promedio);
          await enviarEmail({ to: estudiante.email, ...emailData });
        }
      }
    }
  } catch (err) {
    console.error('Error verificando riesgo académico:', err.message);
  }
}

module.exports = { notasEstudianteEnClase, notasDeClase, crearNota, actualizarNota, eliminarNota };
