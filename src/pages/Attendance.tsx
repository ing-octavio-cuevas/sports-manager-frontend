import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { UserCheck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import { api, getFileUrl } from '@/services/api';
import { formatDate } from '@/utils/dateUtils';

interface PartidoCapitan {
  id: number;
  torneo_id: number;
  torneo_nombre: string;
  jornada_id: number;
  jornada_numero: number;
  jornada_fecha: string;
  equipo_local_id: number;
  equipo_visitante_id: number;
  estatus: string | null;
  tipo: string | null;
  ubicacion_id: number | null;
  ubicacion_nombre: string | null;
  ubicacion_direccion: string | null;
  ubicacion_url: string | null;
  fecha_hora: string | null;
  es_hoy: boolean;
  caducado: boolean;
  asistencia_registrada: boolean;
}

interface AsistenciaRegistro {
  id: number;
  partido_id: number;
  jugador_id: number;
  registrado_por: number;
  metodo: string;
  hora_registro: string;
  jugador_nombre: string;
  jugador_numero: number;
  jugador_foto: string | null;
}

export default function Attendance() {
  const { usuario } = useAuth();
  const { teams } = useApp();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Partidos disponibles
  const [partidos, setPartidos] = useState<PartidoCapitan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartido, setSelectedPartido] = useState<PartidoCapitan | null>(null);

  // Asistencias registradas
  const [asistencias, setAsistencias] = useState<AsistenciaRegistro[]>([]);
  const [loadingAsistencias, setLoadingAsistencias] = useState(false);
  const [miFinalizada, setMiFinalizada] = useState(false);

  // Registro
  const [jugadoresIds, setJugadoresIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [capitanId, setCapitanId] = useState<number | null>(null);
  const [filtroAsistencia, setFiltroAsistencia] = useState<'hoy' | 'caducadas'>('hoy');
  const [partidosPage, setPartidosPage] = useState(1);
  const [partidosPages, setPartidosPages] = useState(1);

  // Buscar el jugador capitán del usuario logueado
  useEffect(() => {
    const findCapitan = async () => {
      if (!usuario) return;
      try {
        const capitan = await api.getMiCapitan();
        if (capitan && capitan.id) {
          setCapitanId(capitan.id);
        }
      } catch { /* ignore */ }
    };
    findCapitan();
  }, [usuario]);

  const fetchPartidos = useCallback(async (filtro?: string, page?: number) => {
    if (!capitanId) { setPartidos([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.getPartidosCapitan(capitanId, filtro || (filtroAsistencia === 'hoy' ? 'hoy' : 'caducados'), page || partidosPage, 6);
      setPartidos(Array.isArray(data.partidos) ? data.partidos : []);
      setPartidosPages(data.pages || 1);
    } catch (err) {
      console.error(err);
      setPartidos([]);
    } finally {
      setLoading(false);
    }
  }, [capitanId, filtroAsistencia, partidosPage]);

  useEffect(() => { fetchPartidos(); }, [fetchPartidos]);

  const getTeamName = (id: number) => teams.find(t => t.id === id)?.nombre || `Equipo ${id}`;
  const getTeamLogo = (id: number) => teams.find(t => t.id === id)?.logo || null;

  // Jugadores del equipo contrario
  const [jugadoresContrario, setJugadoresContrario] = useState<any[]>([]);

  const openPartido = async (p: PartidoCapitan) => {
    setSelectedPartido(p);
    setJugadoresIds([]);
    setMiFinalizada(false);
    setLoadingAsistencias(true);
    try {
      const [asistData, estadoData, jugadoresData] = await Promise.all([
        api.getAsistenciasPartido(p.id),
        api.getEstadoAsistencia(p.id),
        // Cargar jugadores de mi equipo
        (async () => {
          const localJugadores = await api.getJugadores(p.equipo_local_id);
          const localList = Array.isArray(localJugadores) ? localJugadores : [];
          const capitanEnLocal = localList.some((j: any) => j.id === capitanId);
          const miEquipoId = capitanEnLocal ? p.equipo_local_id : p.equipo_visitante_id;
          const miEquipoJugadores = await api.getJugadores(miEquipoId);
          return Array.isArray(miEquipoJugadores) ? miEquipoJugadores : [];
        })(),
      ]);
      setAsistencias(Array.isArray(asistData) ? asistData : []);
      const jugActivos = jugadoresData.filter((j: any) => j.estatus);
      setJugadoresContrario(jugActivos);
      // Pre-seleccionar todos los que no tienen asistencia
      const asistList = Array.isArray(asistData) ? asistData : [];
      setJugadoresIds(jugActivos.filter((j: any) => !asistList.some((a: any) => a.jugador_id === j.id)).map((j: any) => j.id));
      // Verificar si yo ya finalicé
      const yaFinalice = estadoData.registrado_por_local === capitanId || estadoData.registrado_por_visitante === capitanId;
      setMiFinalizada(yaFinalice);
    } catch {
      setAsistencias([]);
      setJugadoresContrario([]);
    } finally {
      setLoadingAsistencias(false);
    }
  };

  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<{ url: string; nombre: string } | null>(null);
  const [viewUbicacion, setViewUbicacion] = useState<{ nombre: string; direccion: string; url: string | null } | null>(null);

  // Guardar asistencias
  const handleSaveAsistencias = async () => {
    if (!selectedPartido || !capitanId || jugadoresIds.length === 0) return;
    setSaving(true);
    try {
      await api.registrarAsistencias({
        partido_id: selectedPartido.id,
        jugador_ids: jugadoresIds,
        registrado_por: capitanId,
      });
      // Recargar asistencias
      const data = await api.getAsistenciasPartido(selectedPartido.id);
      setAsistencias(Array.isArray(data) ? data : []);
      setJugadoresIds([]);
      setMiFinalizada(true);
      setToast({ message: 'Asistencias registradas correctamente', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Error al registrar asistencias', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!capitanId) {
    return (
      <div className="page">
        <div className="page-header"><h2>Asistencias</h2></div>
        <div className="empty-state">
          <UserCheck size={48} />
          <p>Tu cuenta no tiene un jugador/capitán asociado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header"><h2>Asistencias</h2></div>

      {loading ? (
        <div className="empty-state"><p>Cargando partidos...</p></div>
      ) : !selectedPartido ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={`btn btn-sm ${filtroAsistencia === 'hoy' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setFiltroAsistencia('hoy'); setPartidosPage(1); }}>Hoy</button>
              <button className={`btn btn-sm ${filtroAsistencia === 'caducadas' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setFiltroAsistencia('caducadas'); setPartidosPage(1); }}>Pasados</button>
            </div>
            {partidosPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="btn btn-sm btn-ghost" disabled={partidosPage <= 1} onClick={() => setPartidosPage(p => p - 1)}>←</button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{partidosPage}/{partidosPages}</span>
                <button className="btn btn-sm btn-ghost" disabled={partidosPage >= partidosPages} onClick={() => setPartidosPage(p => p + 1)}>→</button>
              </div>
            )}
          </div>
          {partidos.length === 0 ? (
              <div className="empty-state">
                <UserCheck size={48} />
                <p>{filtroAsistencia === 'hoy' ? 'No hay partidos programados para hoy.' : 'No hay partidos pasados.'}</p>
              </div>
            ) : (
              <div className="card-grid">
                {partidos.map(p => (
              <div key={p.id} className="card" style={{ cursor: 'pointer', borderLeft: p.asistencia_registrada ? '4px solid var(--success)' : '4px solid var(--warning)' }} onClick={() => openPartido(p)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <img src={getFileUrl(getTeamLogo(p.equipo_local_id)) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(getTeamName(p.equipo_local_id)) + '&background=3b82f6&color=fff&size=24'} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{getTeamName(p.equipo_local_id)}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>vs</span>
                  <img src={getFileUrl(getTeamLogo(p.equipo_visitante_id)) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(getTeamName(p.equipo_visitante_id)) + '&background=8b5cf6&color=fff&size=24'} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{getTeamName(p.equipo_visitante_id)}</span>
                </div>
                <div className="card-details">
                  <p><strong>Torneo:</strong> {p.torneo_nombre}</p>
                  <p><strong>Jornada:</strong> {p.jornada_numero ? `Jornada ${p.jornada_numero}` : '—'}</p>
                  <p><strong>Fecha:</strong> {p.fecha_hora ? formatDate(p.fecha_hora) : p.jornada_fecha ? formatDate(p.jornada_fecha) : '—'}</p>
                  <p><strong>Hora:</strong> {p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  <p><strong>Lugar:</strong> {p.ubicacion_nombre ? (
                    <button className="btn btn-sm btn-ghost" style={{ padding: 0, textDecoration: 'underline', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); setViewUbicacion({ nombre: p.ubicacion_nombre!, direccion: p.ubicacion_direccion || '', url: p.ubicacion_url || null }); }}>{p.ubicacion_nombre}</button>
                  ) : '—'}</p>
                  <p><strong>Tipo:</strong> {p.tipo || '—'}</p>
                  {p.asistencia_registrada ? (
                    <p style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Asistencia registrada</p>
                  ) : (
                    <p style={{ color: 'var(--warning)', fontWeight: 600 }}>⚠ Sin asistencia registrada</p>
                  )}
                </div>
              </div>
            ))}
          </div>
            )}
        </div>
      ) : (
        <div>
          <button className="btn btn-sm btn-ghost" onClick={() => { setSelectedPartido(null); fetchPartidos(); }} style={{ marginBottom: '1rem' }}>
            ← Volver a partidos
          </button>

          <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <img src={getFileUrl(getTeamLogo(selectedPartido.equipo_local_id)) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(getTeamName(selectedPartido.equipo_local_id)) + '&background=3b82f6&color=fff&size=56'} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                <strong style={{ fontSize: '0.85rem', textAlign: 'center' }}>{getTeamName(selectedPartido.equipo_local_id)}</strong>
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 700 }}>vs</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                <img src={getFileUrl(getTeamLogo(selectedPartido.equipo_visitante_id)) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(getTeamName(selectedPartido.equipo_visitante_id)) + '&background=8b5cf6&color=fff&size=56'} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                <strong style={{ fontSize: '0.85rem', textAlign: 'center' }}>{getTeamName(selectedPartido.equipo_visitante_id)}</strong>
              </div>
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              J{selectedPartido.jornada_numero} · {selectedPartido.fecha_hora ? `${formatDate(selectedPartido.fecha_hora)} ${new Date(selectedPartido.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : selectedPartido.jornada_fecha ? formatDate(selectedPartido.jornada_fecha) : '—'}
            </p>
            {miFinalizada ? (
              <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>✓ Asistencia finalizada</p>
            ) : selectedPartido.caducado ? (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>Este partido ya pasó, no se puede registrar asistencia.</p>
            ) : null}
          </div>

          {/* Registro - solo si no se ha finalizado y el partido es de hoy */}
          {!miFinalizada && !selectedPartido.caducado && (
            <>
              {loadingAsistencias ? (
                <p style={{ color: 'var(--text-secondary)' }}>Cargando jugadores...</p>
              ) : (
              <>
              {/* Lista de jugadores tipo WhatsApp */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <strong style={{ fontSize: '0.85rem' }}>Jugadores presentes</strong>
                  <button className="btn btn-sm btn-ghost" onClick={() => {
                    if (jugadoresIds.length === jugadoresContrario.filter((j: any) => !asistencias.some(a => a.jugador_id === j.id)).length) {
                      setJugadoresIds([]);
                    } else {
                      setJugadoresIds(jugadoresContrario.filter((j: any) => !asistencias.some(a => a.jugador_id === j.id)).map((j: any) => j.id));
                    }
                  }}>
                    {jugadoresIds.length === jugadoresContrario.filter((j: any) => !asistencias.some(a => a.jugador_id === j.id)).length ? 'Quitar todos' : 'Todos'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {jugadoresContrario.filter((j: any) => !asistencias.some(a => a.jugador_id === j.id)).map((j: any) => {
                    const selected = jugadoresIds.includes(j.id);
                    return (
                      <div key={j.id} onClick={() => setJugadoresIds(prev => prev.includes(j.id) ? prev.filter(id => id !== j.id) : [...prev, j.id])} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'var(--transition)', background: selected ? 'rgba(16, 185, 129, 0.06)' : 'var(--card-bg)', border: selected ? '1.5px solid var(--success)' : '1.5px solid var(--border)' }}>
                        <img
                          src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=44'}
                          alt=""
                          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          onClick={(e) => { e.stopPropagation(); setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=256', nombre: j.nombre }); }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.2 }}>{j.nombre}{j.es_capitan ? ' ⭐' : ''}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{j.numero ? `#${j.numero}` : ''}{j.posicion ? ` · ${j.posicion}` : ''}</p>
                        </div>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', border: selected ? 'none' : '2px solid var(--border)', background: selected ? 'var(--success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'var(--transition)' }}>
                          {selected && <span style={{ color: 'white', fontSize: '0.75rem', fontWeight: 800 }}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botón finalizar */}
              {jugadoresIds.length > 0 && (
                <button className="btn btn-primary" onClick={() => setConfirmFinalize(true)} disabled={saving} style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', borderRadius: '50px', justifyContent: 'center' }}>
                  {saving ? 'Finalizando...' : `Finalizar Asistencia (${jugadoresIds.length})`}
                </button>
              )}
              </>
              )}
            </>
          )}

          {/* Resumen de asistencias (cuando ya finalizó o caducó) */}
          {(miFinalizada || selectedPartido.caducado) && (
            <div style={{ marginTop: '1rem' }}>
              {/* Equipo Local */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--accent)' }}>{getTeamName(selectedPartido.equipo_local_id)}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {(() => {
                    const localAsistencias = asistencias.filter((a: any) => a.equipo_id === selectedPartido.equipo_local_id);
                    return localAsistencias.length > 0 ? localAsistencias.map((a: any) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--success-light)' }}>
                        <img src={getFileUrl(a.jugador_foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.jugador_nombre) + '&background=3b82f6&color=fff&size=28'} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewPhoto({ url: getFileUrl(a.jugador_foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.jugador_nombre) + '&background=3b82f6&color=fff&size=256', nombre: a.jugador_nombre })} />
                        <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 500 }}>{a.jugador_nombre}{a.jugador_numero ? ` #${a.jugador_numero}` : ''}</span>
                        <span style={{ color: 'var(--success)', fontSize: '0.9rem' }}>✓{a.hora_registro?.startsWith('1970') && <sup style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>M</sup>}</span>
                      </div>
                    )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sin asistencias registradas</p>;
                  })()}
                </div>
              </div>
              {/* Equipo Visitante */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: '#8b5cf6' }}>{getTeamName(selectedPartido.equipo_visitante_id)}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {(() => {
                    const visitanteAsistencias = asistencias.filter((a: any) => a.equipo_id === selectedPartido.equipo_visitante_id);
                    return visitanteAsistencias.length > 0 ? visitanteAsistencias.map((a: any) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: 'var(--success-light)' }}>
                        <img src={getFileUrl(a.jugador_foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.jugador_nombre) + '&background=8b5cf6&color=fff&size=28'} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewPhoto({ url: getFileUrl(a.jugador_foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(a.jugador_nombre) + '&background=8b5cf6&color=fff&size=256', nombre: a.jugador_nombre })} />
                        <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 500 }}>{a.jugador_nombre}{a.jugador_numero ? ` #${a.jugador_numero}` : ''}</span>
                        <span style={{ color: 'var(--success)', fontSize: '0.9rem' }}>✓{a.hora_registro?.startsWith('1970') && <sup style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>M</sup>}</span>
                      </div>
                    )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sin asistencias registradas</p>;
                  })()}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      <ConfirmDialog
        open={confirmFinalize}
        message="¿Finalizar asistencia? Una vez confirmada, no se podrá modificar."
        onConfirm={() => { setConfirmFinalize(false); handleSaveAsistencias(); }}
        onCancel={() => setConfirmFinalize(false)}
        confirmText="Confirmar"
        confirmStyle="primary"
      />

      {/* View Photo Modal */}
      <Modal open={!!viewPhoto} onClose={() => setViewPhoto(null)} title={viewPhoto?.nombre || 'Foto'}>
        {viewPhoto && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
            <img src={viewPhoto.url} alt={viewPhoto.nombre} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 'var(--radius)', objectFit: 'contain' }} />
          </div>
        )}
      </Modal>

      {/* View Ubicacion Modal */}
      <Modal open={!!viewUbicacion} onClose={() => setViewUbicacion(null)} title={viewUbicacion?.nombre || 'Ubicación'}>
        {viewUbicacion && (
          <div>
            <p><strong>Nombre:</strong> {viewUbicacion.nombre}</p>
            <p><strong>Dirección:</strong> {viewUbicacion.direccion || '—'}</p>
            {viewUbicacion.url && (
              <p style={{ marginTop: '0.75rem' }}>
                <a href={viewUbicacion.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary" style={{ textDecoration: 'none' }}>
                  📍 Ver en Google Maps
                </a>
              </p>
            )}
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
