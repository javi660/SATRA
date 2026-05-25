require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback - todas las rutas sirven index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SATRA Frontend corriendo en http://localhost:${PORT}`);
});
