// entregas.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/entregasController');
const { verificarToken, requiereRol } = require('../middlewares/auth');
const { upload, manejarErrorUpload } = require('../middlewares/upload');

router.use(verificarToken);
router.get('/tarea/:tarea_id', c.entregasDeTarea);
router.post('/', requiereRol('estudiante'), upload.single('archivo'), manejarErrorUpload, c.crearEntrega);
router.put('/:id', requiereRol('estudiante'), upload.single('archivo'), manejarErrorUpload, c.actualizarEntrega);

module.exports = router;
