import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import logo from '@/assets/logo.png';
import Footer from '@/Components/Footer';
import '@/App.css';

export default function LoginPage() {
  const { login, register, loginWithGoogle, resetPasswordForEmail, authError } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);

    if (mode === 'login') {
      await login(email, password);
    } else if (mode === 'register') {
      const { error, needsEmailConfirmation } = await register(email, password, fullName);
      if (!error && needsEmailConfirmation) {
        setNotice('Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.');
        setMode('login');
      }
      // Si no se requiere confirmación, la sesión ya quedó activa y
      // App.jsx te mete directo a la app.
    } else if (mode === 'forgot') {
      const { error } = await resetPasswordForEmail(email);
      if (!error) {
        setNotice('Te enviamos un correo con un enlace para restablecer tu contraseña.');
      }
    }
    setSubmitting(false);
  };

  const titles = {
    login: 'Inicia sesión para continuar',
    register: 'Crea tu cuenta',
    forgot: 'Recupera tu contraseña',
  };

  return (
    <div className="login-page">
      <div className="login-page-content">
        <div className="login-card">
          <div className="login-brand">
            <img src={logo} alt="Intercom" className="login-logo" />
            <h1>Intercom</h1>
            <p>{titles[mode]}</p>
          </div>

          {mode !== 'forgot' && (
            <>
              <button type="button" className="button-google" onClick={loginWithGoogle}>
                <span>G</span>
                Continuar con Google
              </button>
              <div className="divider">o</div>
            </>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'register' && (
              <label>
                Nombre completo
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </label>
            )}

            <label>
              Correo electrónico
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tú@ejemplo.com"
                required
              />
            </label>

            {mode !== 'forgot' && (
              <label>
                Contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </label>
            )}

            {mode === 'login' && (
              <button
                type="button"
                className="login-toggle"
                style={{ marginTop: 0, textAlign: 'right' }}
                onClick={() => { setMode('forgot'); setNotice(null); }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            {authError && <p className="login-error">{authError.message}</p>}
            {notice && <p className="login-notice">{notice}</p>}

            <button type="submit" className="button-submit" disabled={submitting}>
              {submitting
                ? 'Procesando...'
                : mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace de recuperación'}
            </button>
          </form>

          {mode === 'forgot' ? (
            <button type="button" className="login-toggle" onClick={() => { setMode('login'); setNotice(null); }}>
              Volver a iniciar sesión
            </button>
          ) : (
            <button
              type="button"
              className="login-toggle"
              onClick={() => { setMode(m => (m === 'login' ? 'register' : 'login')); setNotice(null); }}
            >
              {mode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
