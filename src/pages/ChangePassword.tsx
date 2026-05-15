import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import Toast from '@/components/ui/Toast';

export default function ChangePassword() {
  const { usuario } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    if (password !== confirmPassword) {
      setToast({ message: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }
    if (password.length < 4) {
      setToast({ message: 'La contraseña debe tener al menos 4 caracteres', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await api.cambiarPassword(password);
      // Actualizar usuario en localStorage para quitar la bandera
      const stored = localStorage.getItem('voleibol_usuario');
      if (stored) {
        const user = JSON.parse(stored);
        user.requiere_cambio_password = false;
        localStorage.setItem('voleibol_usuario', JSON.stringify(user));
      }
      setToast({ message: 'Contraseña actualizada correctamente', type: 'success' });
      setTimeout(() => {
        // Forzar recarga para que el auth context tome el usuario actualizado
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      setToast({ message: err.message || 'Error al cambiar contraseña', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>🔒 Cambiar Contraseña</h1>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Hola {usuario?.nombre}, debes cambiar tu contraseña para continuar.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Nueva contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoFocus />
          </div>
          <div className="form-group">
            <label>Confirmar contraseña</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
