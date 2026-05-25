const express = require('express');
const router = express.Router();
const c = require('../controllers/asistenciaController');
const { verificarToken, requiereRol } = require('../middlewares/auth');

router.use(verificarToken);
router.get('/clase/:clase_id', c.asistenciaDeClase);
router.get('/clase/:clase_id/estudiante/:estudiante_id', c.asistenciaEstudiante);
router.get('/fechas/:clase_id', c.fechasConAsistencia);
router.post('/', requiereRol('administrador', 'profesor'), c.registrarAsistencia);
router.post('/masiva', requiereRol('administrador', 'profesor'), c.registrarAsistenciaMasiva);

module.exports = router;
