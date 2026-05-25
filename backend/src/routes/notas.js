const express = require('express');
const router = express.Router();
const c = require('../controllers/notasController');
const { verificarToken, requiereRol } = require('../middlewares/auth');

router.use(verificarToken);
router.get('/clase/:clase_id', requiereRol('administrador', 'profesor'), c.notasDeClase);
router.get('/clase/:clase_id/estudiante/:estudiante_id', c.notasEstudianteEnClase);
router.post('/', requiereRol('administrador', 'profesor'), c.crearNota);
router.put('/:id', requiereRol('administrador', 'profesor'), c.actualizarNota);
router.delete('/:id', requiereRol('administrador', 'profesor'), c.eliminarNota);

module.exports = router;
