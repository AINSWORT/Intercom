import { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import logo from '@/assets/logo.png';
import Footer from '@/Components/Footer';
import '@/App.css';

export default function ResetPasswordPage() {
  const { updatePassword, authError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) return;
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (!error) setDone(true);
  };

  return (
    <div className="login-page">
      <div className="login-page-content">
        <div className="login-card">
          <div className="login-brand">
            <img src={logo} alt="Intercom" className="login-logo" />
            <h1>Nueva contraseña</h1>
            <p>Elige una contraseña nueva para tu cuenta</p>
          </div>

          {done ? (
            <p className="login-notice">Contraseña actualizada. Ya puedes continuar usando la app.</p>
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <label>
                Nueva contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </label>

              <label>
                Confirmar contraseña
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </label>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="login-error">Las contraseñas no coinciden.</p>
              )}
              {authError && <p className="login-error">{authError.message}</p>}

              <button type="submit" className="button-submit" disabled={submitting || !password || password !== confirmPassword}>
                {submitting ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
