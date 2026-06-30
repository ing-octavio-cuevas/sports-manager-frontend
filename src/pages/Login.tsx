import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { api } from '@/services/api';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [celular, setCelular] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Forgot password flow
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'send' | 'verify'>('send');
  const [forgotValue, setForgotValue] = useState('');
  const [forgotCodigo, setForgotCodigo] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!celular || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(celular, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSend = async () => {
    if (!forgotValue.trim()) return;
    setForgotLoading(true);
    try {
      const isEmail = forgotValue.includes('@');
      await api.recuperarPassword(isEmail ? { email: forgotValue.trim() } : { celular: forgotValue.trim() });
      setForgotStep('verify');
      setToast({ message: 'Se envió un código de verificación a tu correo.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Error al enviar código', type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotVerify = async () => {
    if (!forgotCodigo.trim() || !forgotNewPass || !forgotConfirmPass) return;
    if (forgotNewPass !== forgotConfirmPass) {
      setToast({ message: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }
    if (forgotNewPass.length < 4) {
      setToast({ message: 'La contraseña debe tener al menos 4 caracteres', type: 'error' });
      return;
    }
    setForgotLoading(true);
    try {
      const celularValue = forgotValue.includes('@') ? '' : forgotValue.trim();
      await api.verificarCodigoReset({ celular: celularValue, codigo: forgotCodigo.trim(), new_password: forgotNewPass });
      setToast({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.', type: 'success' });
      closeForgot();
    } catch (err: any) {
      setToast({ message: err.message || 'Código inválido o expirado', type: 'error' });
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotStep('send');
    setForgotValue('');
    setForgotCodigo('');
    setForgotNewPass('');
    setForgotConfirmPass('');
  };

  return (
    <div className="login-page">
      <div className="login-top">
        <div className="login-top-decoration" />
        <div className="login-top-bg-extra" />
        <div className="login-brand">
          <h1>TornealoSports.com</h1>
          <p>Gestión deportiva simplificada</p>
        </div>
      </div>
      <div className="login-brand-desktop">
        <h1>TornealoSports.com</h1>
        <p>Gestión deportiva simplificada</p>
      </div>
      <div className="login-bg-balls" />
      <div className="login-bg-balls-extra" />
      <div className="login-card">
        <div className="login-header">
          <h1>Bienvenido</h1>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <div className="form-group">
            <label>Celular</label>
            <input type="tel" value={celular} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setCelular(v); }} placeholder="Ingresar" maxLength={10} autoFocus />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ingresar" />
          </div>
          <div className="login-divider" />
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button type="button" onClick={() => setForgotOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Olvidé mi contraseña
          </button>
        </p>
      </div>

      <Modal open={forgotOpen} onClose={closeForgot} title="Recuperar contraseña">
        {forgotStep === 'send' ? (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Ingresa tu número de celular o correo electrónico registrado. Te enviaremos un código de verificación.
            </p>
            <div className="form-stack">
              <div className="form-group">
                <label>Celular o correo electrónico</label>
                <input type="text" value={forgotValue} onChange={e => setForgotValue(e.target.value)} placeholder="Ingresar" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeForgot}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleForgotSend} disabled={forgotLoading}>
                {forgotLoading ? 'Enviando...' : 'Enviar código'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Ingresa el código de 6 dígitos que recibiste y tu nueva contraseña.
            </p>
            <div className="form-stack">
              <div className="form-group">
                <label>Código de verificación</label>
                <input type="text" value={forgotCodigo} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setForgotCodigo(v); }} placeholder="000000" maxLength={6} />
              </div>
              <div className="form-group">
                <label>Nueva contraseña</label>
                <input type="password" value={forgotNewPass} onChange={e => setForgotNewPass(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label>Confirmar contraseña</label>
                <input type="password" value={forgotConfirmPass} onChange={e => setForgotConfirmPass(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setForgotStep('send')}>Atrás</button>
              <button className="btn btn-primary" onClick={handleForgotVerify} disabled={forgotLoading}>
                {forgotLoading ? 'Verificando...' : 'Cambiar contraseña'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <p style={{ position: 'fixed', bottom: '1rem', left: 0, right: 0, textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>v{APP_VERSION}</p>
    </div>
  );
}
