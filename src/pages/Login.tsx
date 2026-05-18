import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [celular, setCelular] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="login-page">
      <div className="login-top">
        <div className="login-top-decoration" />
        <div className="login-top-bg-extra" />
        <div className="login-brand">
          <h1>Sports Manager</h1>
          <p>Gestión deportiva simplificada</p>
        </div>
      </div>
      <div className="login-brand-desktop">
        <h1>Sports Manager</h1>
        <p>Gestión deportiva simplificada</p>
      </div>
      <div className="login-bg-balls" />
      <div className="login-bg-balls-extra" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🔐</div>
          <h1>Bienvenido</h1>
          <p>Ingresa tus datos para continuar</p>
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
      </div>
      <p style={{ position: 'fixed', bottom: '1rem', left: 0, right: 0, textAlign: 'center', fontSize: '0.7rem', color: 'rgba(0,0,0,0.25)' }}>v{APP_VERSION}</p>
    </div>
  );
}
