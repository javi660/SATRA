const express = require('express');
const router = express.Router();
const c = require('../controllers/tareasController');
const { verificarToken, requiereRol } = require('../middlewares/auth');
const { upload, manejarErrorUpload } = require('../middlewares/upload');

router.use(verificarToken);
router.get('/clase/:clase_id', c.tareasDeClase);
router.get('/:id', c.obtenerTarea);
router.post('/', requiereRol('administrador', 'profesor'), upload.single('archivo'), manejarErrorUpload, c.crearTarea);
router.put('/:id', requiereRol('administrador', 'profesor'), upload.single('archivo'), manejarErrorUpload, c.actualizarTarea);
router.delete('/:id', requiereRol('administrador', 'profesor'), c.eliminarTarea);

module.exports = router;
