const express = require('express');
const router = express.Router();
const c = require('../controllers/usuariosController');
const { verificarToken, requiereRol } = require('../middlewares/auth');

router.use(verificarToken);
router.get('/', requiereRol('administrador'), c.listarUsuarios);
router.get('/profesores/lista', c.listarProfesores);
router.get('/:id', c.obtenerUsuario);
router.post('/', requiereRol('administrador'), c.crearUsuario);
router.put('/:id', c.actualizarUsuario);
router.patch('/:id/desactivar', requiereRol('administrador'), c.desactivarUsuario);
router.delete('/:id', requiereRol('administrador'), c.eliminarUsuario);

module.exports = router;
