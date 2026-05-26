require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;  // ← Railway inyecta PORT automáticamente

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {  // ← 0.0.0.0 es obligatorio en Railway
  console.log(`SATRA Frontend corriendo en puerto ${PORT}`);
});