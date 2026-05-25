// comentarios.js
const express = require('express');
const router = express.Router();
const c = require('../controllers/comentariosController');
const { verificarToken } = require('../middlewares/auth');

router.use(verificarToken);
router.get('/entrega/:entrega_id', c.comentariosDeEntrega);
router.post('/', c.crearComentario);
router.put('/:id', c.editarComentario);
router.delete('/:id', c.eliminarComentario);

module.exports = router;
