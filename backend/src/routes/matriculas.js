// matriculas.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/matriculasController');
const { verificarToken, requiereRol } = require('../middlewares/auth');

router.use(verificarToken);
router.get('/mis-clases', requiereRol('estudiante'), c.misClases);
router.post('/', requiereRol('estudiante'), c.matricularse);
router.post('/admin', requiereRol('administrador', 'profesor'), c.matricularEstudiante);
router.delete('/:id', c.cancelarMatricula);

module.exports = router;
