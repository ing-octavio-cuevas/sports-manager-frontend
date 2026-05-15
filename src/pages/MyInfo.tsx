import { useState, useEffect, useRef } from 'react';
import { Trophy, Users, Calendar, ClipboardList, QrCode, LayoutGrid, List, Upload } from 'lucide-react';
import { api, getFileUrl } from '@/services/api';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { PartidoSet, PartidoArbitraje } from '@/types';
import { QRCodeSVG } from 'qrcode.react';

interface PartidoInfo {
  id: number;
  jornada_id: number;
  equipo_local_id: number;
  equipo_visitante_id: number;
  puntos_local: number;
  puntos_visitante: number;
  ubicacion_id: number | null;
  fecha_hora: string | null;
  estatus: string;
  tipo: string;
}

interface TorneoInfo {
  torneo_id: number;
  torneo_nombre: string;
  equipo_id: number;
  equipo_nombre: string;
  jugador_id: number;
  es_capitan: boolean;
  partidos: PartidoInfo[];
}

interface MiInformacion {
  usuario_id: number;
  nombre: string;
  email: string;
  torneos: TorneoInfo[];
}

export default function MyInfo() {
  const [info, setInfo] = useState<MiInformacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTorneo, setSelectedTorneo] = useState<TorneoInfo | null>(null);
  const [equiposMap, setEquiposMap] = useState<Record<number, string>>({});
  const [ubicacionesMap, setUbicacionesMap] = useState<Record<number, { nombre: string; direccion: string; ubicacion: string }>>({});
  const [viewUbicacion, setViewUbicacion] = useState<{ nombre: string; direccion: string; ubicacion: string } | null>(null);

  // Detalle partido
  const [viewPartido, setViewPartido] = useState<PartidoInfo | null>(null);
  const [partidoSets, setPartidoSets] = useState<PartidoSet[]>([]);
  const [partidoArbitrajes, setPartidoArbitrajes] = useState<PartidoArbitraje[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Tabla de posiciones
  const [showStandings, setShowStandings] = useState(false);
  const [standings, setStandings] = useState<{ equipo_id: number; equipo_nombre: string; pj: number; pg: number; pp: number; sg: number; sp: number; pts: number }[]>([]);
  const [loadingStandings, setLoadingStandings] = useState(false);

  // Arbitrajes de partidos
  const [partidosArbMap, setPartidosArbMap] = useState<Record<number, PartidoArbitraje[]>>({});

  // Mi equipo
  const [showMiEquipo, setShowMiEquipo] = useState(false);
  const [miEquipoJugadores, setMiEquipoJugadores] = useState<any[]>([]);
  const [loadingMiEquipo, setLoadingMiEquipo] = useState(false);
  const [editingJugador, setEditingJugador] = useState<any | null>(null);
  const [jugadorForm, setJugadorForm] = useState({ nombre: '', numero: 0, posicion: '', estatus: true, curp: '' });
  const [asistenciaMap, setAsistenciaMap] = useState<Record<number, { partidos_asistidos: number; total_partidos: number; porcentaje_asistencia: number }>>({});

  // Equipo contrario
  const [showEquipoContrario, setShowEquipoContrario] = useState(false);
  const [equipoContrarioJugadores, setEquipoContrarioJugadores] = useState<any[]>([]);
  const [equipoContrarioNombre, setEquipoContrarioNombre] = useState('');
  const [loadingContrario, setLoadingContrario] = useState(false);

  // QR
  const [viewQR, setViewQR] = useState<{ codigo: string; nombre: string } | null>(null);
  const [miEquipoView, setMiEquipoView] = useState<'table' | 'cards'>('cards');

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await api.getMiInformacion();
        setInfo(data);
        // Cargar nombres de equipos
        const equipos = await api.getEquipos();
        const map: Record<number, string> = {};
        if (Array.isArray(equipos)) {
          equipos.forEach((e: any) => { map[e.id] = e.nombre; });
        }
        setEquiposMap(map);
        // Cargar ubicaciones de los torneos
        const ubMap: Record<number, { nombre: string; direccion: string; ubicacion: string }> = {};
        const torneoIds = [...new Set(data.torneos.map((t: TorneoInfo) => t.torneo_id))] as number[];
        await Promise.all(torneoIds.map(async (tid: number) => {
          try {
            const ubs = await api.getUbicaciones(tid);
            if (Array.isArray(ubs)) ubs.forEach((u: any) => { ubMap[u.id] = { nombre: u.nombre, direccion: u.direccion || '', ubicacion: u.ubicacion || '' }; });
          } catch { /* ignore */ }
        }));
        setUbicacionesMap(ubMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  const openPartidoDetail = async (p: PartidoInfo) => {
    setViewPartido(p);
    setLoadingDetalle(true);
    try {
      const [sets, arbs] = await Promise.all([
        api.getSets(p.id),
        api.getArbitrajes(p.id),
      ]);
      setPartidoSets(Array.isArray(sets) ? sets : []);
      setPartidoArbitrajes(Array.isArray(arbs) ? arbs : []);
    } catch {
      setPartidoSets([]);
      setPartidoArbitrajes([]);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const openStandings = async (torneoId: number) => {
    setShowStandings(true);
    setLoadingStandings(true);
    try {
      const data = await api.getTablaPosiciones(torneoId);
      setStandings(Array.isArray(data) ? data : []);
    } catch {
      setStandings([]);
    } finally {
      setLoadingStandings(false);
    }
  };

  const openMiEquipo = async (equipoId: number) => {
    setShowMiEquipo(true);
    setLoadingMiEquipo(true);
    try {
      const [data, resumen] = await Promise.all([
        api.getJugadores(equipoId),
        selectedTorneo ? api.getResumenAsistencia(equipoId, selectedTorneo.torneo_id) : Promise.resolve(null),
      ]);
      setMiEquipoJugadores(Array.isArray(data) ? data : []);
      // Mapear asistencia por jugador_id
      if (resumen && Array.isArray(resumen.jugadores)) {
        const map: Record<number, { partidos_asistidos: number; total_partidos: number; porcentaje_asistencia: number }> = {};
        resumen.jugadores.forEach((j: any) => {
          map[j.jugador_id] = { partidos_asistidos: j.partidos_asistidos, total_partidos: j.total_partidos, porcentaje_asistencia: j.porcentaje_asistencia };
        });
        setAsistenciaMap(map);
      } else {
        setAsistenciaMap({});
      }
    } catch {
      setMiEquipoJugadores([]);
      setAsistenciaMap({});
    } finally {
      setLoadingMiEquipo(false);
    }
  };

  const openEditJugador = (j: any) => {
    setEditingJugador(j);
    setJugadorForm({ nombre: j.nombre, numero: j.numero, posicion: j.posicion, estatus: j.estatus, curp: j.curp || '' });
  };

  // Eliminar jugador
  const [deleteJugadorId, setDeleteJugadorId] = useState<number | null>(null);

  // Foto jugador
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<number | null>(null);
  const [viewPhoto, setViewPhoto] = useState<{ url: string; nombre: string } | null>(null);

  const handleDeleteJugador = async () => {
    if (!selectedTorneo || deleteJugadorId === null) return;
    try {
      await api.deleteJugador(deleteJugadorId);
      const data = await api.getJugadores(selectedTorneo.equipo_id);
      setMiEquipoJugadores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
    setDeleteJugadorId(null);
  };

  const handleUploadPhoto = (jugadorId: number) => {
    setUploadingPhotoId(jugadorId);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingPhotoId === null || !selectedTorneo) return;
    try {
      await api.uploadFotoJugador(uploadingPhotoId, file);
      const data = await api.getJugadores(selectedTorneo.equipo_id);
      setMiEquipoJugadores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
    setUploadingPhotoId(null);
    e.target.value = '';
  };

  const handleSaveJugador = async () => {
    if (!jugadorForm.nombre.trim() || !selectedTorneo) return;
    const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    const nombre = toTitleCase(jugadorForm.nombre.trim());
    try {
      if (editingJugador === 'new') {
        await api.createJugador({
          equipo_id: selectedTorneo.equipo_id,
          nombre,
          numero: jugadorForm.numero,
          posicion: jugadorForm.posicion,
          estatus: jugadorForm.estatus,
          es_capitan: false,
          fecha_creacion: new Date().toISOString(),
          foto: null,
          curp: jugadorForm.curp || null,
        });
      } else if (editingJugador) {
        await api.updateJugador(editingJugador.id, {
          nombre,
          numero: jugadorForm.numero,
          posicion: jugadorForm.posicion,
          estatus: jugadorForm.estatus,
          es_capitan: editingJugador.es_capitan,
          fecha_creacion: editingJugador.fecha_creacion,
          foto: editingJugador.foto,
          curp: jugadorForm.curp || null,
        });
      }
      const data = await api.getJugadores(selectedTorneo.equipo_id);
      setMiEquipoJugadores(Array.isArray(data) ? data : []);
      setEditingJugador(null);
    } catch (err) {
      console.error(err);
    }
  };

  const openEquipoContrario = async (partidoInfo: PartidoInfo) => {
    if (!selectedTorneo) return;
    const contrarioId = partidoInfo.equipo_local_id === selectedTorneo.equipo_id
      ? partidoInfo.equipo_visitante_id
      : partidoInfo.equipo_local_id;
    setEquipoContrarioNombre(equiposMap[contrarioId] || `Equipo ${contrarioId}`);
    setShowEquipoContrario(true);
    setLoadingContrario(true);
    try {
      const data = await api.getJugadores(contrarioId);
      setEquipoContrarioJugadores(Array.isArray(data) ? data : []);
    } catch {
      setEquipoContrarioJugadores([]);
    } finally {
      setLoadingContrario(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state"><p>Cargando información...</p></div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="page">
        <div className="empty-state">
          <Users size={48} />
          <p>No se pudo cargar tu información.</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="page">
      <div className="page-header">
        <h2>Mi Información</h2>
      </div>

      {/* Info del jugador */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>{info.nombre}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{info.email}</p>
      </div>

      {/* Torneos */}
      <h3 style={{ marginBottom: '1rem' }}>Mis Torneos</h3>
      {info.torneos.length === 0 ? (
        <div className="empty-state">
          <Trophy size={48} />
          <p>No estás inscrito en ningún torneo.</p>
        </div>
      ) : !selectedTorneo ? (
        <div className="card-grid">
          {[...info.torneos].filter((t, i, arr) => arr.findIndex(x => x.torneo_id === t.torneo_id) === i).sort((a, b) => a.torneo_id - b.torneo_id).map(t => (
            <div key={t.torneo_id} className="card" style={{ cursor: 'pointer' }} onClick={async () => {
              setSelectedTorneo(t);
              // Cargar arbitrajes de los partidos
              const arbMap: Record<number, PartidoArbitraje[]> = {};
              await Promise.all(t.partidos.map(async (p) => {
                try {
                  const arbs = await api.getArbitrajes(p.id);
                  arbMap[p.id] = Array.isArray(arbs) ? arbs : [];
                } catch { arbMap[p.id] = []; }
              }));
              setPartidosArbMap(arbMap);
            }}>
              <div className="card-header-row">
                <img
                  src={'https://ui-avatars.com/api/?name=' + encodeURIComponent(t.torneo_nombre) + '&background=3b82f6&color=fff&size=48'}
                  alt="" className="card-logo"
                />
                <div>
                  <h3 className="card-title">{t.torneo_nombre}</h3>
                  <span className={`badge badge-active`}>{t.es_capitan ? '⭐ Capitán' : 'Jugador'}</span>
                </div>
              </div>
              <div className="card-details">
                <p><strong>Equipo:</strong> {t.equipo_nombre}</p>
                <p><strong>Partidos:</strong> {t.partidos.length}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button className="btn btn-sm btn-ghost" onClick={() => setSelectedTorneo(null)} style={{ marginBottom: '1rem' }}>
            ← Volver a torneos
          </button>

          <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <Trophy size={24} style={{ color: 'var(--accent)' }} />
              <div>
                <h3>{selectedTorneo.torneo_nombre}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Equipo: <strong>{selectedTorneo.equipo_nombre}</strong> {selectedTorneo.es_capitan && '⭐ Capitán'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => openStandings(selectedTorneo.torneo_id)}>
                <ClipboardList size={16} /> Tabla de Posiciones
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => openMiEquipo(selectedTorneo.equipo_id)}>
                <Users size={16} /> Mi Equipo
              </button>
            </div>
          </div>

          <h4 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} /> Partidos ({selectedTorneo.partidos.length})
          </h4>

          {selectedTorneo.partidos.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No hay partidos programados.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Jornada</th>
                    <th>Local</th>
                    <th></th>
                    <th>Visitante</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Lugar</th>
                    <th>Tipo</th>
                    <th>Estatus</th>
                    <th title="Arbitraje pagado">💰</th>
                    <th>Rival</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTorneo.partidos.map(p => (
                    <tr key={p.id} style={{ background: p.estatus === 'Jugado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', cursor: 'pointer' }} onClick={() => openPartidoDetail(p)}>
                      <td>J{p.jornada_id}</td>
                      <td><strong>{equiposMap[p.equipo_local_id] || `Eq. ${p.equipo_local_id}`}</strong></td>
                      <td className="text-center" style={{ fontWeight: 700 }}>{p.puntos_local} | {p.puntos_visitante}</td>
                      <td><strong>{equiposMap[p.equipo_visitante_id] || `Eq. ${p.equipo_visitante_id}`}</strong></td>
                      <td>{p.fecha_hora ? new Date(p.fecha_hora).toLocaleDateString() : '—'}</td>
                      <td>{p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{p.ubicacion_id && ubicacionesMap[p.ubicacion_id] ? <button className="btn btn-sm btn-ghost" style={{ padding: 0, textDecoration: 'underline' }} onClick={(e) => { e.stopPropagation(); setViewUbicacion(ubicacionesMap[p.ubicacion_id!]); }}>{ubicacionesMap[p.ubicacion_id].nombre}</button> : '—'}</td>
                      <td>{p.tipo}</td>
                      <td><span className={`badge badge-${p.estatus === 'Jugado' ? 'active' : 'warning'}`}>{p.estatus}</span></td>
                      <td className="text-center">
                        {(() => {
                          const arbs = partidosArbMap[p.id] || [];
                          const miArb = arbs.find(a => a.equipo_id === selectedTorneo.equipo_id);
                          if (!miArb) return <span style={{ color: 'var(--text-secondary)' }}>—</span>;
                          return miArb.pagado
                            ? <span style={{ color: 'var(--success)' }}>✓</span>
                            : <span style={{ color: 'var(--danger)' }}>✗</span>;
                        })()}
                      </td>
                      <td className="text-center">
                        <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); openEquipoContrario(p); }} title="Ver equipo rival">
                          <Users size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>

      {/* Mi Equipo Modal */}
      <Modal open={showMiEquipo} onClose={() => { setShowMiEquipo(false); setEditingJugador(null); }} title={`Mi Equipo — ${selectedTorneo?.equipo_nombre || ''}`} extraWide>
        {loadingMiEquipo ? (
          <p>Cargando jugadores...</p>
        ) : editingJugador || editingJugador === 'new' ? (
          <div>
            <h4 style={{ marginBottom: '1rem' }}>{editingJugador === 'new' ? 'Nuevo Jugador' : `Editar: ${editingJugador.nombre}`}</h4>
            <div className="form-stack">
              <div className="form-group">
                <label>Nombre *</label>
                <input value={jugadorForm.nombre} onChange={e => setJugadorForm({ ...jugadorForm, nombre: e.target.value })} placeholder="Nombre completo" />
              </div>
              <div className="form-group">
                <label>Número</label>
                <input type="text" inputMode="numeric" value={jugadorForm.numero || ''} onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) setJugadorForm({ ...jugadorForm, numero: e.target.value === '' ? 0 : Number(e.target.value) }); }} />
              </div>
              <div className="form-group">
                <label>Posición</label>
                <select value={jugadorForm.posicion} onChange={e => setJugadorForm({ ...jugadorForm, posicion: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  <option value="Setter">Setter</option>
                  <option value="Libero">Líbero</option>
                  <option value="Centro">Centro</option>
                  <option value="Opuesto">Opuesto</option>
                  <option value="Punta">Punta</option>
                  <option value="Universal">Universal</option>
                </select>
              </div>
              <div className="form-group">
                <label>CURP</label>
                <input value={jugadorForm.curp} onChange={e => setJugadorForm({ ...jugadorForm, curp: e.target.value.slice(0, 18).toUpperCase() })} maxLength={18} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingJugador(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveJugador}>{editingJugador === 'new' ? 'Crear' : 'Guardar'}</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              {selectedTorneo?.es_capitan ? (
                <button className="btn btn-primary btn-sm" onClick={() => { setEditingJugador('new'); setJugadorForm({ nombre: '', numero: 0, posicion: '', estatus: true, curp: '' }); }}>
                  + Agregar Jugador
                </button>
              ) : <div />}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className={`btn btn-sm ${miEquipoView === 'cards' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMiEquipoView('cards')}><LayoutGrid size={16} /></button>
                <button className={`btn btn-sm ${miEquipoView === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMiEquipoView('table')}><List size={16} /></button>
              </div>
            </div>
            {miEquipoJugadores.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No hay jugadores registrados.</p>
            ) : miEquipoView === 'cards' ? (
              <div className="card-grid">
                {[...miEquipoJugadores].filter(j => j.estatus).sort((a, b) => a.id - b.id).map((j: any) => (
                  <div key={j.id} className="card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=48'} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=256', nombre: j.nombre })} />
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{j.nombre} {j.es_capitan && '⭐'}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>#{j.numero} · {j.posicion || 'Sin posición'}</p>
                      </div>
                    </div>
                    {asistenciaMap[j.id] && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        📋 Asistencia: <strong>{asistenciaMap[j.id].porcentaje_asistencia.toFixed(1)}%</strong> ({asistenciaMap[j.id].partidos_asistidos}/{asistenciaMap[j.id].total_partidos})
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge badge-${j.estatus ? 'active' : 'inactive'}`}>{j.estatus ? 'Activo' : 'Inactivo'}</span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {j.codigo_qr && <button className="btn btn-sm btn-ghost" onClick={() => setViewQR({ codigo: j.codigo_qr, nombre: j.nombre })}><QrCode size={16} /></button>}
                        {selectedTorneo?.es_capitan && <button className="btn btn-sm btn-ghost" onClick={() => handleUploadPhoto(j.id)} title="Subir foto"><Upload size={16} /></button>}
                        {selectedTorneo?.es_capitan && <button className="btn btn-sm btn-ghost" onClick={() => openEditJugador(j)}>Editar</button>}
                        {selectedTorneo?.es_capitan && <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteJugadorId(j.id)}>Eliminar</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nombre</th>
                      <th>#</th>
                      <th>Posición</th>
                      <th>Capitán</th>
                      <th>Asistencia</th>
                      <th>Estatus</th>
                      <th>QR</th>
                      {selectedTorneo?.es_capitan && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {[...miEquipoJugadores].filter(j => j.estatus).sort((a, b) => a.id - b.id).map((j: any) => (
                      <tr key={j.id}>
                        <td><img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=32'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=256', nombre: j.nombre })} /></td>
                        <td><strong>{j.nombre}</strong></td>
                        <td>{j.numero}</td>
                        <td>{j.posicion}</td>
                        <td className="text-center">{j.es_capitan ? '⭐' : '—'}</td>
                        <td className="text-center">
                          {asistenciaMap[j.id]
                            ? <span title={`${asistenciaMap[j.id].partidos_asistidos}/${asistenciaMap[j.id].total_partidos} partidos`}>{asistenciaMap[j.id].porcentaje_asistencia.toFixed(1)}%</span>
                            : '—'}
                        </td>
                        <td><span className={`badge badge-${j.estatus ? 'active' : 'inactive'}`}>{j.estatus ? 'Activo' : 'Inactivo'}</span></td>
                        <td className="text-center">
                          {j.codigo_qr ? (
                            <button className="btn btn-sm btn-ghost" onClick={() => setViewQR({ codigo: j.codigo_qr, nombre: j.nombre })} title="Ver QR"><QrCode size={16} /></button>
                          ) : '—'}
                        </td>
                        {selectedTorneo?.es_capitan && (
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-sm btn-ghost" onClick={() => handleUploadPhoto(j.id)} title="Subir foto"><Upload size={14} /></button>
                              <button className="btn btn-sm btn-ghost" onClick={() => openEditJugador(j)}>Editar</button>
                              <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteJugadorId(j.id)}>Eliminar</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif" style={{ display: 'none' }} onChange={onFileSelected} />
      </Modal>

      {/* Equipo Contrario Modal */}
      <Modal open={showEquipoContrario} onClose={() => setShowEquipoContrario(false)} title={`Equipo Rival — ${equipoContrarioNombre}`} wide>
        {loadingContrario ? (
          <p>Cargando jugadores...</p>
        ) : equipoContrarioJugadores.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No hay jugadores registrados.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Nombre</th>
                  <th>#</th>
                  <th>Posición</th>
                  <th>Capitán</th>
                </tr>
              </thead>
              <tbody>
                {[...equipoContrarioJugadores].sort((a, b) => a.id - b.id).map((j: any) => (
                  <tr key={j.id}>
                    <td><img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=32'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /></td>
                    <td><strong>{j.nombre}</strong></td>
                    <td>{j.numero}</td>
                    <td>{j.posicion}</td>
                    <td className="text-center">{j.es_capitan ? '⭐' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Tabla de Posiciones Modal */}
      <Modal open={showStandings} onClose={() => setShowStandings(false)} title={`Tabla de Posiciones — ${selectedTorneo?.torneo_nombre || ''}`} wide>
        {loadingStandings ? (
          <p>Cargando tabla...</p>
        ) : standings.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No hay datos de posiciones.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipo</th>
                  <th>PJ</th>
                  <th>PG</th>
                  <th>PP</th>
                  <th>SG</th>
                  <th>SP</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr key={row.equipo_id} className={i < 3 ? 'top-row' : ''} style={{ background: row.equipo_id === selectedTorneo?.equipo_id ? 'var(--accent-light)' : undefined }}>
                    <td className="rank">{i + 1}</td>
                    <td className="team-cell"><strong>{row.equipo_nombre}</strong> {row.equipo_id === selectedTorneo?.equipo_id && <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>(tú)</span>}</td>
                    <td>{row.pj}</td>
                    <td>{row.pg}</td>
                    <td>{row.pp}</td>
                    <td>{row.sg}</td>
                    <td>{row.sp}</td>
                    <td className="points-cell"><strong>{row.pts}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="standings-legend">
              <p><strong>PJ</strong> = Partidos Jugados · <strong>PG</strong> = Ganados · <strong>PP</strong> = Perdidos</p>
              <p><strong>SG</strong> = Sets Ganados · <strong>SP</strong> = Sets Perdidos · <strong>Pts</strong> = Puntos</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Detalle Partido Modal */}
      <Modal open={!!viewPartido} onClose={() => setViewPartido(null)} title="Detalle del Partido" wide>
        {loadingDetalle ? (
          <p>Cargando detalle...</p>
        ) : viewPartido && selectedTorneo && (
          <div>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Local</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{equiposMap[viewPartido.equipo_local_id] || '?'}</p>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-secondary)' }}>vs</span>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Visitante</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8b5cf6' }}>{equiposMap[viewPartido.equipo_visitante_id] || '?'}</p>
              </div>
            </div>

            {/* Puntos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'center', background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{viewPartido.puntos_local}</p>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Puntos</span>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{viewPartido.puntos_visitante}</p>
            </div>

            {/* Info */}
            <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
              <p><strong>Tipo:</strong> {viewPartido.tipo}</p>
              <p><strong>Estatus:</strong> <span className={`badge badge-${viewPartido.estatus === 'Jugado' ? 'active' : 'warning'}`}>{viewPartido.estatus}</span></p>
            </div>

            {/* Sets */}
            {partidoSets.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Sets</h4>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Set</th>
                        <th className="text-center">{equiposMap[viewPartido.equipo_local_id] || 'Local'}</th>
                        <th className="text-center">{equiposMap[viewPartido.equipo_visitante_id] || 'Visitante'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...partidoSets].sort((a, b) => a.numero_set - b.numero_set).map(s => (
                        <tr key={s.id}>
                          <td><strong>Set {s.numero_set}</strong></td>
                          <td className="text-center" style={{ fontWeight: s.marcador_local > s.marcador_visitante ? 700 : 400, color: s.marcador_local > s.marcador_visitante ? 'var(--accent)' : undefined }}>{s.marcador_local}</td>
                          <td className="text-center" style={{ fontWeight: s.marcador_visitante > s.marcador_local ? 700 : 400, color: s.marcador_visitante > s.marcador_local ? '#8b5cf6' : undefined }}>{s.marcador_visitante}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Arbitraje de mi equipo */}
            <div>
              <h4 style={{ marginBottom: '0.75rem' }}>Arbitraje</h4>
              {partidoArbitrajes.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>Sin información de arbitraje.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Equipo</th>
                        <th>Pagado</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partidoArbitrajes.map(arb => (
                        <tr key={arb.id} style={{ background: arb.equipo_id === selectedTorneo.equipo_id ? 'var(--accent-light)' : undefined }}>
                          <td><strong>{equiposMap[arb.equipo_id] || `Eq. ${arb.equipo_id}`}</strong> {arb.equipo_id === selectedTorneo.equipo_id && <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>(tu equipo)</span>}</td>
                          <td>{arb.pagado ? <span style={{ color: 'var(--success)' }}>✓ Pagado</span> : <span style={{ color: 'var(--danger)' }}>✗ Pendiente</span>}</td>
                          <td>{arb.monto !== null ? `$${arb.monto}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Ubicacion Modal */}
      <Modal open={!!viewUbicacion} onClose={() => setViewUbicacion(null)} title={viewUbicacion?.nombre || 'Ubicación'}>
        {viewUbicacion && (
          <div>
            <div className="detail-grid" style={{ marginBottom: '1rem' }}>
              <p><strong>Nombre:</strong> {viewUbicacion.nombre}</p>
              <p><strong>Dirección:</strong> {viewUbicacion.direccion || '—'}</p>
            </div>
            {viewUbicacion.ubicacion && (
              <a href={viewUbicacion.ubicacion} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                Abrir en Google Maps
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* QR Modal */}
      <Modal open={!!viewQR} onClose={() => setViewQR(null)} title={viewQR ? `QR — ${viewQR.nombre}` : ''}>
        {viewQR && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', gap: '1rem' }}>
            <QRCodeSVG value={viewQR.codigo} size={200} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-all', textAlign: 'center' }}>{viewQR.codigo}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteJugadorId} message="¿Eliminar este jugador?" onConfirm={handleDeleteJugador} onCancel={() => setDeleteJugadorId(null)} />

      {/* View Photo Modal */}
      <Modal open={!!viewPhoto} onClose={() => setViewPhoto(null)} title={viewPhoto?.nombre || 'Foto'}>
        {viewPhoto && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
            <img src={viewPhoto.url} alt={viewPhoto.nombre} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 'var(--radius)', objectFit: 'contain' }} />
          </div>
        )}
      </Modal>
    </>
  );
}
