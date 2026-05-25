const validarEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validarEmailCUL = (email) => {
  return email.endsWith('@cul.edu.co');
};

const validarNota = (valor) => {
  const num = parseFloat(valor);
  return !isNaN(num) && num >= 0 && num <= 5;
};

const validarPorcentaje = (valor) => {
  const num = parseFloat(valor);
  return !isNaN(num) && num > 0 && num <= 100;
};

const sanitizarTexto = (texto) => {
  if (!texto) return texto;
  return texto.trim().replace(/<script[^>]*>.*?<\/script>/gi, '').substring(0, 5000);
};

// Middleware: validar login
const validarLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }
  if (!validarEmail(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }
  next();
};

// Middleware: validar registro de usuario
const validarRegistro = (req, res, next) => {
  const { nombre, apellido, email, password, rol } = req.body;
  
  if (!nombre || !apellido || !email || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }
  if (!['estudiante', 'profesor', 'administrador'].includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  if (rol !== 'administrador' && !validarEmailCUL(email)) {
    return res.status(400).json({ error: 'Los profesores y estudiantes deben usar correo @cul.edu.co' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  req.body.nombre = sanitizarTexto(nombre);
  req.body.apellido = sanitizarTexto(apellido);
  next();
};

// Middleware: validar nota
const validarNuevaNote = (req, res, next) => {
  const { valor, tipo } = req.body;
  if (!validarNota(valor)) {
    return res.status(400).json({ error: 'La nota debe ser un número entre 0.0 y 5.0' });
  }
  if (!['actividad', 'parcial', 'asistencia'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de nota inválido' });
  }
  next();
};

module.exports = { 
  validarLogin, 
  validarRegistro, 
  validarNuevaNote,
  validarEmail, 
  validarEmailCUL, 
  validarNota,
  sanitizarTexto 
};
