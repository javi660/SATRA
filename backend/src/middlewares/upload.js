const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Asegurar que existe el directorio de uploads
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_PATH);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const nombre = `${uuidv4()}${ext}`;
    cb(null, nombre);
  }
});

const fileFilter = (req, file, cb) => {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
});

const manejarErrorUpload = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `El archivo supera el límite de ${process.env.MAX_FILE_SIZE_MB || 10}MB` });
    }
    return res.status(400).json({ error: 'Error al subir el archivo: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = { upload, manejarErrorUpload };
