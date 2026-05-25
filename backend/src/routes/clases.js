const express = require('express');
const router = express.Router();
const c = require('../controllers/clasesController');
const { verificarToken, requiereRol } = require('../middlewares/auth');

router.use(verificarToken);
router.get('/', c.listarClases);
router.get('/disponibles', requiereRol('estudiante'), c.clasesDisponibles);
router.get('/:id', c.obtenerClase);
router.get('/:id/estudiantes', requiereRol('administrador', 'profesor'), c.estudiantesDeClase);
router.post('/', requiereRol('administrador'), c.crearClase);
router.put('/:id', requiereRol('administrador', 'profesor'), c.actualizarClase);
router.delete('/:id', requiereRol('administrador'), c.eliminarClase);

module.exports = router;
