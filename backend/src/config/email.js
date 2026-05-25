const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const emailConfigurado = () => {
  const pass = process.env.EMAIL_PASS || '';
  return pass && pass !== 'your_app_password_here';
};

const enviarEmail = async ({ to, subject, html, text }) => {
  if (!emailConfigurado()) {
    console.warn(`[Email] No configurado - se omite envío a ${to}`);
    return { ok: false, error: 'Email no configurado' };
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    });
    console.log(`[Email] Enviado a ${to}: ${info.messageId}`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email] Error:', err.message);
    return { ok: false, error: err.message };
  }
};

const emailAlertaAcademica = (nombre, clase, promedio) => ({
  subject: `[SATRA] Alerta de Riesgo Académico - ${clase}`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:#2c3e50;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">SATRA</h1>
        <p style="color:#95a5a6;margin:4px 0 0;">Sistema de Alerta Temprana de Riesgo Académico</p>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#e74c3c;margin-top:0;">⚠ Alerta de Riesgo Académico</h2>
        <p>Estimado/a <strong>${nombre}</strong>,</p>
        <p>Te informamos que tu promedio actual en la materia <strong>${clase}</strong> es de:</p>
        <div style="background:#fdf2f2;border-left:4px solid #e74c3c;padding:16px;margin:16px 0;border-radius:4px;">
          <span style="font-size:32px;font-weight:bold;color:#e74c3c;">${promedio}</span>
          <span style="color:#666;font-size:14px;"> / 5.0</span>
        </div>
        <p>Este promedio está <strong>por debajo del mínimo aprobatorio (3.0)</strong>. Te recomendamos:</p>
        <ul style="color:#444;line-height:1.8;">
          <li>Hablar con tu docente sobre estrategias de mejora</li>
          <li>Revisar tus entregas pendientes y actividades</li>
          <li>Asistir regularmente a clases</li>
          <li>Solicitar tutorías académicas si es necesario</li>
        </ul>
        <p style="color:#666;font-size:13px;">Este es un mensaje automático generado por SATRA - CUL. No respondas a este correo.</p>
      </div>
      <div style="background:#f5f5f5;padding:16px;text-align:center;">
        <p style="color:#999;font-size:12px;margin:0;">Corporación Universitaria Latinoamericana - CUL</p>
      </div>
    </div>
  `
});

const emailRecuperacion = (nombre, token) => ({
  subject: '[SATRA] Recuperación de contraseña',
  html: `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:#2c3e50;padding:24px;text-align:center;">
        <h1 style="color:#fff;margin:0;">SATRA</h1>
      </div>
      <div style="padding:32px 24px;">
        <h2 style="color:#2c3e50;">Recuperación de contraseña</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código:</p>
        <div style="background:#f0f4ff;border:2px dashed #3498db;padding:20px;text-align:center;border-radius:8px;margin:20px 0;">
          <span style="font-size:28px;font-weight:bold;letter-spacing:8px;color:#2c3e50;">${token}</span>
        </div>
        <p style="color:#e74c3c;font-size:13px;">Este código expira en 1 hora. Si no solicitaste este cambio, ignora este correo.</p>
      </div>
    </div>
  `
});

module.exports = { transporter, enviarEmail, emailAlertaAcademica, emailRecuperacion };
