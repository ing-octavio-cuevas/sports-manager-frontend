import { useState, useEffect } from 'react';

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';
const CHECK_INTERVAL = 60000; // Revisa cada 60 segundos

export default function VersionChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        if (data.version && data.version !== CURRENT_VERSION) {
          setUpdateAvailable(true);
        }
      } catch { /* silencioso */ }
    };

    checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'var(--accent)',
      color: 'white',
      padding: '0.6rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      fontSize: '0.85rem',
      fontWeight: 500,
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <span>Nueva versión disponible</span>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'white',
          color: 'var(--accent)',
          border: 'none',
          borderRadius: '4px',
          padding: '0.3rem 0.75rem',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Recargar
      </button>
    </div>
  );
}
