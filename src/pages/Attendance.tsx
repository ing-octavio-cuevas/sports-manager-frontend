import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { UserCheck, Camera, Keyboard, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import { api, getFileUrl } from '@/services/api';
import { formatDate } from '@/utils/dateUtils';
import { Html5Qrcode } from 'html5-qrcode';

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
  const [manualCode, setManualCode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanProcessedRef = useRef(false);
  const [capitanId, setCapitanId] = useState<number | null>(null);

  // Preview jugador escaneado
  const [previewJugador, setPreviewJugador] = useState<any | null>(null);

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

  const fetchPartidos = useCallback(async () => {
    if (!capitanId) { setPartidos([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.getPartidosCapitan(capitanId);
      const list = Array.isArray(data) ? data : [];
      setPartidos(list);
    } catch (err) {
      console.error(err);
      setPartidos([]);
    } finally {
      setLoading(false);
    }
  }, [capitanId]);

  useEffect(() => { fetchPartidos(); }, [fetchPartidos]);

  const getTeamName = (id: number) => teams.find(t => t.id === id)?.nombre || `Equipo ${id}`;

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
        // Cargar jugadores del equipo contrario
        (async () => {
          const localJugadores = await api.getJugadores(p.equipo_local_id);
          const localList = Array.isArray(localJugadores) ? localJugadores : [];
          const capitanEnLocal = localList.some((j: any) => j.id === capitanId);
          const contrarioId = capitanEnLocal ? p.equipo_visitante_id : p.equipo_local_id;
          const contrarioJugadores = await api.getJugadores(contrarioId);
          return Array.isArray(contrarioJugadores) ? contrarioJugadores : [];
        })(),
      ]);
      setAsistencias(Array.isArray(asistData) ? asistData : []);
      setJugadoresContrario(jugadoresData.filter((j: any) => j.estatus));
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

  // Agregar jugador por codigo_qr
  const addPlayerByCode = async (code: string) => {
    const cleanCode = code.trim();

    if (!cleanCode) return;

    try {
      if (!selectedPartido) return;

      const jugadorYaEscaneado = jugadoresContrario.find(
        (j: any) => j.codigo_qr === cleanCode && jugadoresIds.includes(j.id)
      );

      if (jugadorYaEscaneado) {
        setToast({ message: 'Jugador ya registrado', type: 'error' });
        return;
      }

      const jugadorConAsistencia = jugadoresContrario.find(
        (j: any) => j.codigo_qr === cleanCode && asistencias.some(a => a.jugador_id === j.id)
      );

      if (jugadorConAsistencia) {
        setToast({ message: 'Jugador ya registrado', type: 'error' });
        return;
      }

      // Buscar en ambos equipos
      const equipoLocalJugadores = await api.getJugadores(selectedPartido.equipo_local_id);
      const equipoVisitanteJugadores = await api.getJugadores(selectedPartido.equipo_visitante_id);
      const todosJugadores = [
        ...(Array.isArray(equipoLocalJugadores) ? equipoLocalJugadores : []),
        ...(Array.isArray(equipoVisitanteJugadores) ? equipoVisitanteJugadores : []),
      ];

      const jugador = todosJugadores.find((j: any) => j.codigo_qr === cleanCode);

      if (!jugador) {
        setToast({ message: 'Código QR incorrecto', type: 'error' });
        return;
      }

      if (jugadoresIds.includes(jugador.id)) {
        setToast({ message: 'Jugador ya registrado', type: 'error' });
        return;
      }

      if (asistencias.some(a => a.jugador_id === jugador.id)) {
        setToast({ message: 'Jugador ya registrado', type: 'error' });
        return;
      }

      setPreviewJugador(jugador);
      // Pausar el scanner mientras se muestra el preview
      if (scannerRef.current) {
        try { await scannerRef.current.pause(); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al buscar jugador', type: 'error' });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPlayerByCode(manualCode);
    setManualCode('');
  };

  const confirmPreviewJugador = async () => {
    if (!previewJugador) return;
    setJugadoresIds(prev => [...prev, previewJugador.id]);
    setToast({ message: `✓ ${previewJugador.nombre} (#${previewJugador.numero})`, type: 'success' });
    setPreviewJugador(null);
    // Reanudar scanner si estaba abierto
    if (scannerRef.current && scannerOpen) {
      try { await scannerRef.current.resume(); } catch { /* ignore */ }
    }
  };

  const cancelPreviewJugador = async () => {
    setPreviewJugador(null);
    if (scannerRef.current && scannerOpen) {
      try { await scannerRef.current.resume(); } catch { /* ignore */ }
    }
  };

  // Scanner QR
  const startScanner = async () => {
    scanProcessedRef.current = false;
    setScannerOpen(true);

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (scanProcessedRef.current) return;

            scanProcessedRef.current = true;
            await stopScanner();
            await addPlayerByCode(decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.error(err);
        setToast({ message: 'No se pudo acceder a la cámara', type: 'error' });
        setScannerOpen(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      try { await scannerRef.current.clear(); } catch { /* ignore */ }
      scannerRef.current = null;
    }

    setScannerOpen(false);
  };

  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [viewPhoto, setViewPhoto] = useState<{ url: string; nombre: string } | null>(null);
  const [filtroAsistencia, setFiltroAsistencia] = useState<'hoy' | 'caducadas'>('hoy');
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

  const removeJugador = (id: number) => {
    setJugadoresIds(prev => prev.filter(jid => jid !== id));
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
      ) : partidos.length === 0 ? (
        <div className="empty-state">
          <UserCheck size={48} />
          <p>No tienes partidos disponibles para registrar asistencia.</p>
        </div>
      ) : !selectedPartido ? (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button className={`btn btn-sm ${filtroAsistencia === 'hoy' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFiltroAsistencia('hoy')}>Hoy</button>
            <button className={`btn btn-sm ${filtroAsistencia === 'caducadas' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFiltroAsistencia('caducadas')}>Pasados</button>
          </div>
          {(() => {
            const filtrados = partidos.filter(p => {
              if (filtroAsistencia === 'hoy') return p.es_hoy || (!p.caducado && p.asistencia_registrada);
              return p.caducado;
            });
            return filtrados.length === 0 ? (
              <div className="empty-state">
                <UserCheck size={48} />
                <p>{filtroAsistencia === 'hoy' ? 'No hay partidos programados para hoy.' : 'No hay partidos pasados.'}</p>
              </div>
            ) : (
              <div className="card-grid">
                {filtrados.map(p => (
              <div key={p.id} className="card" style={{ cursor: 'pointer', borderLeft: p.asistencia_registrada ? '4px solid var(--success)' : undefined }} onClick={() => openPartido(p)}>
                <h3 className="card-title">{getTeamName(p.equipo_local_id)} vs {getTeamName(p.equipo_visitante_id)}</h3>
                <div className="card-details">
                  <p><strong>Torneo:</strong> {p.torneo_nombre}</p>
                  <p><strong>Jornada:</strong> {p.jornada_numero ? `Jornada ${p.jornada_numero}` : '—'}</p>
                  <p><strong>Fecha:</strong> {p.fecha_hora ? formatDate(p.fecha_hora) : p.jornada_fecha ? formatDate(p.jornada_fecha) : '—'}</p>
                  <p><strong>Hora:</strong> {p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  <p><strong>Lugar:</strong> {p.ubicacion_nombre ? (
                    <button className="btn btn-sm btn-ghost" style={{ padding: 0, textDecoration: 'underline', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); setViewUbicacion({ nombre: p.ubicacion_nombre!, direccion: p.ubicacion_direccion || '', url: p.ubicacion_url || null }); }}>{p.ubicacion_nombre}</button>
                  ) : '—'}</p>
                  <p><strong>Tipo:</strong> {p.tipo || '—'}</p>
                  {p.asistencia_registrada && (
                    <p style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Asistencia registrada</p>
                  )}
                </div>
              </div>
            ))}
          </div>
            );
          })()}
        </div>
      ) : (
        <div>
          <button className="btn btn-sm btn-ghost" onClick={() => { setSelectedPartido(null); fetchPartidos(); }} style={{ marginBottom: '1rem' }}>
            ← Volver a partidos
          </button>

          <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>{getTeamName(selectedPartido.equipo_local_id)} vs {getTeamName(selectedPartido.equipo_visitante_id)}</h3>
            {miFinalizada ? (
              <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>✓ Asistencia finalizada</p>
            ) : selectedPartido.caducado ? (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>Este partido ya pasó, no se puede registrar asistencia.</p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Escanea o ingresa el código QR de cada jugador del equipo contrario.</p>
            )}
          </div>

          {/* Registro - solo si no se ha finalizado y el partido es de hoy */}
          {!miFinalizada && !selectedPartido.caducado && (
            <>
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 250 }}>
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Código QR del jugador..."
                style={{ flex: 1, padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
              />
              <button type="submit" className="btn btn-primary"><Keyboard size={16} /> Agregar</button>
            </form>
            <button className="btn btn-secondary" onClick={startScanner}><Camera size={16} /> Escanear QR</button>
          </div>

          {/* Jugadores pendientes de guardar */}
          {jugadoresIds.length > 0 && (
            <div style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong>{jugadoresIds.length} jugador(es) a registrar</strong>
                <button className="btn btn-sm btn-primary" onClick={() => setConfirmFinalize(true)} disabled={saving}>
                  {saving ? 'Finalizando...' : 'Finalizar Asistencia'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {jugadoresIds.map(id => {
                  const j = jugadoresContrario.find((jug: any) => jug.id === id);
                  return (
                    <span key={id} style={{ background: 'white', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                      <img src={getFileUrl(j?.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j?.nombre || '?') + '&background=6366f1&color=fff&size=20'} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                      <span>{j?.nombre || `ID ${id}`} #{j?.numero || '?'}</span>
                      <button onClick={() => removeJugador(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex' }}><X size={12} /></button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
            </>
          )}

          {/* Asistencias */}
          <h4 style={{ marginBottom: '0.75rem' }}>Asistencias</h4>
          {loadingAsistencias ? (
            <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
          ) : jugadoresContrario.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No hay jugadores registrados.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Nombre</th>
                    <th>#</th>
                    <th>Hora</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {[...jugadoresContrario].sort((a, b) => a.id - b.id).map((j: any) => {
                    const asistencia = asistencias.find(a => a.jugador_id === j.id);
                    const pendiente = jugadoresIds.includes(j.id);
                    return (
                      <tr key={j.id} style={{ background: asistencia ? 'rgba(16, 185, 129, 0.1)' : pendiente ? 'rgba(59, 130, 246, 0.1)' : undefined }}>
                        <td>
                          <img
                            src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=32'}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=256', nombre: j.nombre })}
                          />
                        </td>
                        <td><strong>{j.nombre}</strong>{j.es_capitan && <span style={{ fontSize: '0.7rem', verticalAlign: 'super', marginLeft: '2px' }}>⭐</span>}</td>
                        <td>{j.numero}</td>
                        <td>{asistencia ? new Date(asistencia.hora_registro).toLocaleTimeString() : '—'}</td>
                        <td>
                          {asistencia ? <span className="badge badge-active">✓ Presente</span>
                            : pendiente ? <span className="badge badge-warning">Pendiente</span>
                            : <span className="badge badge-inactive">Sin asistencia</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Preview Jugador Modal */}
      <Modal open={!!previewJugador} onClose={cancelPreviewJugador} title="Jugador encontrado">
        {previewJugador && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <img
              src={getFileUrl(previewJugador.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(previewJugador.nombre) + '&background=6366f1&color=fff&size=128'}
              alt={previewJugador.nombre}
              style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }}
            />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{previewJugador.nombre}</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>#{previewJugador.numero} · {previewJugador.posicion}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={cancelPreviewJugador}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmPreviewJugador}>Aceptar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Scanner Modal */}
      <Modal open={scannerOpen} onClose={stopScanner} title="Escanear QR">
        <div id="qr-reader" style={{ width: '100%' }} />
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={stopScanner}>Cerrar cámara</button>
        </div>
      </Modal>

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
