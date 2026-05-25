const express = require('express');
const router = express.Router();
const c = require('../controllers/notificacionesController');
const { verificarToken } = require('../middlewares/auth');

router.use(verificarToken);
router.get('/', c.misNotificaciones);
router.get('/pendientes-count', c.contarPendientes);
router.put('/leer-todas', c.marcarTodasLeidas);
router.put('/:id/leer', c.marcarLeida);
router.delete('/:id', c.eliminarNotificacion);

module.exports = router;
