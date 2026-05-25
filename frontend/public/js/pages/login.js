// =============================================
// SATRA - Login Page
// =============================================

function renderLogin() {
  const root = document.getElementById('login-root') || document.body;
  root.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <img src="/assets/logo.png" alt="SATRA" onerror="this.style.display='none'">
        </div>
        <h2>Iniciar Sesión</h2>
        <p class="subtitle">Sistema de Alerta Temprana de Riesgo Académico</p>

        <div id="login-error" class="alert alert-error hidden"></div>

        <div id="login-view">
          <form id="login-form">
            <div class="form-group">
              <label class="form-label" for="email">Correo electrónico</label>
              <input type="email" id="email" name="email" class="form-control"
                placeholder="usuario@cul.edu.co" autocomplete="email" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <input type="password" id="password" name="password" class="form-control"
                placeholder="••••••••" autocomplete="current-password" required>
            </div>
            <button type="submit" class="btn btn-primary w-full" id="btn-login" style="justify-content:center;margin-top:8px">
              Ingresar
            </button>
          </form>
          <p style="text-align:center;margin-top:16px;font-size:.85rem">
            <a href="#" id="link-recuperar">¿Olvidaste tu contraseña?</a>
          </p>
          <p style="text-align:center;margin-top:8px;font-size:.85rem;color:var(--text-secondary)">
            ¿No tienes cuenta?
            <a href="#" id="link-registro">Regístrate aquí</a>
          </p>
        </div>

        <div id="recuperar-view" class="hidden">
          <p style="font-size:.875rem;color:var(--text-secondary);margin-bottom:16px">
            Ingresa tu correo y te enviaremos un código de recuperación.
          </p>
          <form id="recuperar-form">
            <div class="form-group">
              <label class="form-label">Correo electrónico</label>
              <input type="email" name="email" class="form-control" placeholder="usuario@cul.edu.co" required>
            </div>
            <button type="submit" class="btn btn-primary w-full" style="justify-content:center">Enviar código</button>
          </form>
          <p style="text-align:center;margin-top:12px;font-size:.85rem">
            <a href="#" id="link-volver-login">Volver al inicio de sesión</a>
          </p>
        </div>

        <div id="resetear-view" class="hidden">
          <p style="font-size:.875rem;color:var(--text-secondary);margin-bottom:16px">
            Ingresa el código recibido y tu nueva contraseña.
          </p>
          <form id="resetear-form">
            <input type="hidden" id="reset-email" name="email">
            <div class="form-group">
              <label class="form-label">Código de verificación</label>
              <input type="text" name="token" class="form-control" placeholder="123456" maxlength="6" required
                style="font-size:1.4rem;letter-spacing:.3rem;text-align:center;font-family:var(--font-mono)">
            </div>
            <div class="form-group">
              <label class="form-label">Nueva contraseña</label>
              <input type="password" name="nueva_password" class="form-control"
                placeholder="Mínimo 8 caracteres" required minlength="8">
            </div>
            <button type="submit" class="btn btn-primary w-full" style="justify-content:center">Cambiar contraseña</button>
          </form>
        </div>

        <div id="registro-view" class="hidden">
          <form id="registro-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nombre <span class="required">*</span></label>
                <input type="text" name="nombre" class="form-control" placeholder="Nombre" required>
              </div>
              <div class="form-group">
                <label class="form-label">Apellido <span class="required">*</span></label>
                <input type="text" name="apellido" class="form-control" placeholder="Apellido" required>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Correo @cul.edu.co <span class="required">*</span></label>
              <input type="email" name="email" class="form-control" placeholder="usuario@cul.edu.co" required>
            </div>
            <div class="form-group">
              <label class="form-label">Contraseña <span class="required">*</span></label>
              <input type="password" name="password" class="form-control" placeholder="Mínimo 8 caracteres" required minlength="8">
            </div>
            <div class="form-group">
              <label class="form-label">Rol <span class="required">*</span></label>
              <select name="rol" class="form-control" required>
                <option value="">Seleccionar rol</option>
                <option value="estudiante">Estudiante</option>
                <option value="profesor">Profesor</option>
              </select>
            </div>
            <div class="form-group" id="campo-codigo" style="display:none">
              <label class="form-label">Código estudiantil</label>
              <input type="text" name="codigo_estudiantil" class="form-control" placeholder="Ej: 2024001">
            </div>
            <button type="submit" class="btn btn-primary w-full" style="justify-content:center">Crear cuenta</button>
          </form>
          <p style="text-align:center;margin-top:12px;font-size:.85rem">
            <a href="#" id="link-volver-login2">Ya tengo cuenta</a>
          </p>
        </div>

      </div>
    </div>
  `;

  // Mostrar campo código cuando rol = estudiante
  const rolSelect = root.querySelector('select[name="rol"]');
  const campoCodigo = root.querySelector('#campo-codigo');
  rolSelect?.addEventListener('change', () => {
    campoCodigo.style.display = rolSelect.value === 'estudiante' ? 'block' : 'none';
  });

  // Función para mostrar vista
  function mostrarVista(id) {
    ['login-view', 'recuperar-view', 'resetear-view', 'registro-view'].forEach(v => {
      root.querySelector(`#${v}`).classList.toggle('hidden', v !== id);
    });
    root.querySelector('#login-error').classList.add('hidden');
  }

  function mostrarError(msg) {
    const el = root.querySelector('#login-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  // Cambiar vistas
  root.querySelector('#link-recuperar')?.addEventListener('click', (e) => {
    e.preventDefault(); mostrarVista('recuperar-view');
  });
  root.querySelector('#link-volver-login')?.addEventListener('click', (e) => {
    e.preventDefault(); mostrarVista('login-view');
  });
  root.querySelector('#link-volver-login2')?.addEventListener('click', (e) => {
    e.preventDefault(); mostrarVista('login-view');
  });
  root.querySelector('#link-registro')?.addEventListener('click', (e) => {
    e.preventDefault(); mostrarVista('registro-view');
  });

  // LOGIN
  root.querySelector('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = root.querySelector('#btn-login');
    Helpers.setLoading(btn, true);
    try {
      const data = await authAPI.login(
        e.target.email.value.trim(),
        e.target.password.value
      );
      Auth.setSession(data.token, data.usuario);
      await iniciarApp();
    } catch (err) {
      mostrarError(err.message || 'Error al iniciar sesión');
      Helpers.setLoading(btn, false, 'Ingresar');
    }
  });

  // RECUPERAR
  root.querySelector('#recuperar-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    Helpers.setLoading(btn, true);
    try {
      const email = e.target.email.value.trim();
      await authAPI.recuperar(email);
      root.querySelector('#reset-email').value = email;
      Toast.success('Código enviado. Revisa tu correo.');
      mostrarVista('resetear-view');
    } catch (err) {
      mostrarError(err.message);
    } finally {
      Helpers.setLoading(btn, false, 'Enviar código');
    }
  });

  // RESETEAR
  root.querySelector('#resetear-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    Helpers.setLoading(btn, true);
    try {
      await authAPI.resetear({
        email: root.querySelector('#reset-email').value,
        token: e.target.token.value.trim(),
        nueva_password: e.target.nueva_password.value
      });
      Toast.success('Contraseña cambiada. Ya puedes iniciar sesión.');
      mostrarVista('login-view');
    } catch (err) {
      mostrarError(err.message);
    } finally {
      Helpers.setLoading(btn, false, 'Cambiar contraseña');
    }
  });

  // REGISTRO
  root.querySelector('#registro-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    Helpers.setLoading(btn, true);
    try {
      const formData = Form.getData(e.target);
      const data = await authAPI.registro(formData);
      Auth.setSession(data.token, data.usuario);
      Toast.success('Cuenta creada correctamente');
      await iniciarApp();
    } catch (err) {
      mostrarError(err.message);
    } finally {
      Helpers.setLoading(btn, false, 'Crear cuenta');
    }
  });
}
