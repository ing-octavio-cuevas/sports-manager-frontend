import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Trophy, Users, Calendar, ClipboardList, Shield,
  Menu, X, LogOut, UserCheck, User, ChevronDown
} from 'lucide-react';
import { useState } from 'react';

const roleLabels: Record<string, string> = {
  anfitrion: 'Anfitrión',
  jugador: 'Jugador',
  arbitro: 'Árbitro',
};

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeRole, setActiveRole] = useState<string>(() => {
    const saved = localStorage.getItem('voleibol_active_role');
    if (saved && usuario?.roles?.includes(saved)) return saved;
    return usuario?.roles?.[0] || 'anfitrion';
  });
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const handleRoleChange = (role: string) => {
    setActiveRole(role);
    localStorage.setItem('voleibol_active_role', role);
    setRoleDropdownOpen(false);
    navigate(role === 'anfitrion' ? '/tournaments' : role === 'jugador' ? '/my-info' : '/results');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hasMultipleRoles = (usuario?.roles?.length || 0) > 1;

  const navItems = activeRole === 'anfitrion' ? [
    { to: '/tournaments', label: 'Torneos', icon: <Trophy size={20} /> },
    { to: '/teams', label: 'Equipos', icon: <Users size={20} /> },
    { to: '/matchdays', label: 'Jornadas', icon: <Calendar size={20} /> },
    { to: '/standings', label: 'Tabla de Posiciones', icon: <ClipboardList size={20} /> },
    { to: '/referees', label: 'Árbitros', icon: <Shield size={20} /> },
    { to: '/results', label: 'Resultados', icon: <ClipboardList size={20} /> },
  ] : activeRole === 'jugador' ? [
    { to: '/my-info', label: 'Mi Información', icon: <User size={20} /> },
    { to: '/attendance', label: 'Asistencias', icon: <UserCheck size={20} /> },
  ] : [
    { to: '/results', label: 'Resultados', icon: <ClipboardList size={20} /> },
  ];

  return (
    <div className="layout">
      {/* Mobile header */}
      <header className="mobile-header">
        <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menú">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="mobile-title">🏐 SportsManager</h1>
      </header>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>🏐 SportsManager</h2>
        </div>

        {usuario && (
          <div className="role-selector">
            <span className="role-label">Sesión activa</span>
            <p style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>{usuario.nombre}</p>
            <p style={{ color: 'var(--sidebar-text)', fontSize: '0.75rem' }}>{usuario.email}</p>

            {hasMultipleRoles ? (
              <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px', padding: '0.4rem 0.75rem', color: 'white',
                    fontSize: '0.8rem', cursor: 'pointer', width: '100%', justifyContent: 'space-between'
                  }}
                >
                  <span>Vista: {roleLabels[activeRole] || activeRole}</span>
                  <ChevronDown size={14} />
                </button>
                {roleDropdownOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem',
                    background: 'white', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    overflow: 'hidden', zIndex: 10
                  }}>
                    {usuario.roles.map(r => (
                      <button
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        style={{
                          display: 'block', width: '100%', padding: '0.5rem 0.75rem', border: 'none',
                          background: r === activeRole ? 'var(--accent-light)' : 'white',
                          color: r === activeRole ? 'var(--accent)' : 'var(--text)',
                          fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', fontWeight: r === activeRole ? 600 : 400
                        }}
                      >
                        {roleLabels[r] || r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ marginTop: '0.25rem' }}>
                <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>{roleLabels[activeRole] || activeRole}</span>
              </p>
            )}
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              {item.icon} <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 'auto' }}>
          <button className="nav-link" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
            <LogOut size={20} /> <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
