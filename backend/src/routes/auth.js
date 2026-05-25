const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middlewares/auth');
const { validarLogin, validarRegistro } = require('../middlewares/validacion');

router.post('/login', validarLogin, authController.login);
router.post('/registro', validarRegistro, authController.registro);
router.post('/recuperar-password', authController.solicitarRecuperacion);
router.post('/resetear-password', authController.resetearPassword);
router.get('/me', verificarToken, authController.perfil);
router.put('/actualizar-pagina', verificarToken, authController.actualizarPagina);
router.put('/configuracion', verificarToken, authController.actualizarConfiguracion);
router.put('/cambiar-password', verificarToken, authController.cambiarPassword);

module.exports = router;
