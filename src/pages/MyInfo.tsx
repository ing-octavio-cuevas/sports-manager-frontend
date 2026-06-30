import { useState, useEffect, useRef } from 'react';
import { Trophy, Users, Calendar, ClipboardList, LayoutGrid, List, Upload, UserCircle } from 'lucide-react';
import { api, getFileUrl } from '@/services/api';
import { formatDate } from '@/utils/dateUtils';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import type { PartidoSet, PartidoArbitraje } from '@/types';

interface PartidoInfo {
  id: number;
  jornada_id: number;
  jornada_numero: number;
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
  torneo_logo: string | null;
  torneo_reglamento: string | null;
  torneo_publicado: boolean;
  equipo_id: number;
  equipo_nombre: string;
  jugador_id: number;
  es_capitan: boolean;
}

interface MiInformacion {
  usuario_id: number;
  nombre: string;
  celular: string;
  email: string | null;
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
  const [standings, setStandings] = useState<{ equipo_id: number; equipo_nombre: string; equipo_logo: string | null; pj: number; pg: number; pp: number; sg: number; sp: number; pts: number }[]>([]);
  const [loadingStandings, setLoadingStandings] = useState(false);

  // Estadísticas del equipo
  const [showEstadisticas, setShowEstadisticas] = useState(false);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(false);

  // Arbitrajes de partidos
  const [partidosArbMap, setPartidosArbMap] = useState<Record<number, PartidoArbitraje[]>>({});

  // Mi equipo
  const [showMiEquipo, setShowMiEquipo] = useState(false);
  const [partidosPage, setPartidosPage] = useState(1);
  const [partidosBuscar, setPartidosBuscar] = useState('');
  const [partidosData, setPartidosData] = useState<{ partidos: PartidoInfo[]; total: number; pages: number }>({ partidos: [], total: 0, pages: 0 });
  const [loadingPartidos, setLoadingPartidos] = useState(false);
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

  const fetchPartidosPaginados = async (torneoId: number, page: number, buscar?: string) => {
    setLoadingPartidos(true);
    try {
      const data = await api.getMiInformacionPartidos(torneoId, page, 6, buscar || undefined);
      setPartidosData({ partidos: data.partidos || [], total: data.total || 0, pages: data.pages || 0 });
      // Mapear arbitrajes
      const arbMap: Record<number, any[]> = {};
      (data.partidos || []).forEach((p: any) => {
        arbMap[p.id] = Array.isArray(p.arbitrajes) ? p.arbitrajes : [];
      });
      setPartidosArbMap(arbMap);
    } catch {
      setPartidosData({ partidos: [], total: 0, pages: 0 });
    } finally {
      setLoadingPartidos(false);
    }
  };

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

  const openEstadisticas = async (equipoId: number, torneoId: number) => {
    setShowEstadisticas(true);
    setLoadingEstadisticas(true);
    try {
      const data = await api.getEquipoEstadisticas(equipoId, torneoId);
      setEstadisticas(data);
    } catch {
      setEstadisticas(null);
    } finally {
      setLoadingEstadisticas(false);
    }
  };

  const openMiEquipo = async (equipoId: number) => {
    setShowMiEquipo(true);
    setLoadingMiEquipo(true);
    try {
      const equipoData = await api.getEquipo(equipoId);
      setLocalTeamLogo(equipoData?.logo || null);
    } catch {
      setLocalTeamLogo(null);
    }
    try {
      const data = await api.getJugadores(equipoId, selectedTorneo?.torneo_id);
      const list = Array.isArray(data) ? data : [];
      setMiEquipoJugadores(list);
      // Mapear asistencia desde los campos del jugador
      const map: Record<number, { partidos_asistidos: number; total_partidos: number; porcentaje_asistencia: number }> = {};
      list.forEach((j: any) => {
        if (j.porcentaje_asistencia !== null && j.porcentaje_asistencia !== undefined) {
          map[j.id] = { partidos_asistidos: j.partidos_asistidos, total_partidos: j.total_partidos, porcentaje_asistencia: j.porcentaje_asistencia };
        }
      });
      setAsistenciaMap(map);
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [localTeamLogo, setLocalTeamLogo] = useState<string | null>(null);

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
      {!selectedTorneo && (
      <div className="page-header">
        <h2>Mi Información</h2>
      </div>
      )}

      {/* Info del jugador - solo en home */}
      {!selectedTorneo && (
      <div style={{ textAlign: 'center', padding: '2rem 1rem 1.5rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
          <UserCircle size={36} color="white" strokeWidth={1.5} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>{info.nombre}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{info.celular}{info.email ? ` · ${info.email}` : ''}</p>
      </div>
      )}

      {/* Torneos */}
      {!selectedTorneo && <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Mis Torneos</p>}
      {info.torneos.length === 0 ? (
        <div className="empty-state">
          <Trophy size={48} />
          <p>No estás inscrito en ningún torneo.</p>
        </div>
      ) : !selectedTorneo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[...info.torneos].filter((t, i, arr) => t.torneo_publicado && arr.findIndex(x => x.torneo_id === t.torneo_id) === i).sort((a, b) => a.torneo_id - b.torneo_id).map(t => (
            <div key={t.torneo_id} onClick={() => {
              setSelectedTorneo(t);
              setPartidosPage(1);
              setPartidosBuscar('');
              fetchPartidosPaginados(t.torneo_id, 1);
            }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: 'pointer', transition: 'var(--transition)' }}>
              <img
                src={t.torneo_logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t.torneo_nombre) + '&background=3b82f6&color=fff&size=40'}
                alt="" style={{ width: 40, height: 40, borderRadius: '10px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.torneo_nombre}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.equipo_nombre} · {t.es_capitan ? '⭐ Capitán' : 'Jugador'}</p>
              </div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>›</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => openStandings(selectedTorneo.torneo_id)} style={{ justifyContent: 'center' }}>
                <ClipboardList size={16} /> Posiciones
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => openMiEquipo(selectedTorneo.equipo_id)} style={{ justifyContent: 'center' }}>
                <Users size={16} /> Mi Equipo
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => openEstadisticas(selectedTorneo.equipo_id, selectedTorneo.torneo_id)} style={{ justifyContent: 'center' }}>
                📊 Estadísticas
              </button>
              {selectedTorneo.torneo_reglamento && (
                <a href={selectedTorneo.torneo_reglamento} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary" style={{ textDecoration: 'none', justifyContent: 'center' }}>
                  📄 Reglamento
                </a>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} /> Partidos ({partidosData.total})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={partidosBuscar}
                  onChange={e => setPartidosBuscar(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { setPartidosPage(1); fetchPartidosPaginados(selectedTorneo!.torneo_id, 1, partidosBuscar); } }}
                  placeholder="Buscar rival..."
                  style={{ padding: '0.3rem 0.6rem', paddingRight: partidosBuscar ? '1.5rem' : '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', width: '120px' }}
                />
                {partidosBuscar && (
                  <button onClick={() => { setPartidosBuscar(''); setPartidosPage(1); fetchPartidosPaginados(selectedTorneo!.torneo_id, 1, ''); }} style={{ position: 'absolute', right: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', padding: '2px' }}>✕</button>
                )}
              </div>
              <button className="btn btn-sm btn-ghost" disabled={partidosPage <= 1} onClick={() => { const p = partidosPage - 1; setPartidosPage(p); fetchPartidosPaginados(selectedTorneo!.torneo_id, p, partidosBuscar); }}>←</button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{partidosPage}/{partidosData.pages || 1}</span>
              <button className="btn btn-sm btn-ghost" disabled={partidosPage >= partidosData.pages} onClick={() => { const p = partidosPage + 1; setPartidosPage(p); fetchPartidosPaginados(selectedTorneo!.torneo_id, p, partidosBuscar); }}>→</button>
            </div>
          </div>

          {loadingPartidos ? (
            <p style={{ color: 'var(--text-secondary)' }}>Cargando partidos...</p>
          ) : partidosData.partidos.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No hay partidos programados.</p>
          ) : (
            <>
              {/* Vista cards para móvil */}
              <div className="partidos-cards-mobile">
                {[...partidosData.partidos].sort((a, b) => (b.fecha_hora || '').localeCompare(a.fecha_hora || '')).map(p => (
                  <div key={p.id} style={{ background: (() => {
                    if (p.estatus !== 'Jugado') return 'var(--card-bg)';
                    const miEquipoId = selectedTorneo!.equipo_id;
                    const misPuntos = p.equipo_local_id === miEquipoId ? p.puntos_local : p.puntos_visitante;
                    const rivalPuntos = p.equipo_local_id === miEquipoId ? p.puntos_visitante : p.puntos_local;
                    if (misPuntos === 0 && rivalPuntos === 0) return 'rgba(100, 116, 139, 0.06)';
                    if (misPuntos > rivalPuntos) return 'rgba(16, 185, 129, 0.08)';
                    if (misPuntos < rivalPuntos) return 'rgba(239, 68, 68, 0.06)';
                    return 'rgba(100, 116, 139, 0.06)';
                  })(), borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderLeft: p.estatus === 'Jugado' ? '3px solid var(--success)' : '3px solid var(--warning)', padding: '0.6rem 0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>J{p.jornada_numero} · {p.fecha_hora ? formatDate(p.fecha_hora) : '—'}{p.tipo ? ` · ${p.tipo}` : ''}</span>
                      <button className="btn btn-sm btn-ghost" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => openPartidoDetail(p)}>Ver</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.4rem' }}>
                      <p style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.8rem', color: p.puntos_local > p.puntos_visitante ? 'var(--accent)' : 'var(--text-secondary)' }}>{equiposMap[p.equipo_local_id] || 'Local'}</p>
                      <span style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', minWidth: '45px' }}>
                        <span style={{ color: p.puntos_local > p.puntos_visitante ? 'var(--accent)' : 'var(--text-secondary)' }}>{p.puntos_local}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> - </span>
                        <span style={{ color: p.puntos_visitante > p.puntos_local ? 'var(--accent)' : 'var(--text-secondary)' }}>{p.puntos_visitante}</span>
                      </span>
                      <p style={{ textAlign: 'left', fontWeight: 700, fontSize: '0.8rem', color: p.puntos_visitante > p.puntos_local ? 'var(--accent)' : 'var(--text-secondary)' }}>{equiposMap[p.equipo_visitante_id] || 'Visitante'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista tabla para desktop */}
              <div className="partidos-table-desktop">
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
                      {[...partidosData.partidos].sort((a, b) => (b.fecha_hora || '').localeCompare(a.fecha_hora || '')).map(p => (
                        <tr key={p.id} style={{ background: p.estatus === 'Jugado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', cursor: 'pointer' }} onClick={() => openPartidoDetail(p)}>
                          <td>J{p.jornada_numero}</td>
                          <td><strong>{equiposMap[p.equipo_local_id] || `Eq. ${p.equipo_local_id}`}</strong></td>
                          <td className="text-center" style={{ fontWeight: 700 }}>{p.puntos_local} | {p.puntos_visitante}</td>
                          <td><strong>{equiposMap[p.equipo_visitante_id] || `Eq. ${p.equipo_visitante_id}`}</strong></td>
                          <td>{p.fecha_hora ? formatDate(p.fecha_hora) : '—'}</td>
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
              </div>
            </>
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
                <input value={jugadorForm.nombre} onChange={e => { if (editingJugador === 'new') setJugadorForm({ ...jugadorForm, nombre: e.target.value }); }} placeholder="Nombre completo" disabled={editingJugador !== 'new'} style={editingJugador !== 'new' ? { background: 'var(--bg)', cursor: 'not-allowed' } : undefined} />
              </div>
              <div className="form-group">
                <label>Número</label>
                <input type="text" inputMode="numeric" value={jugadorForm.numero || ''} onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) setJugadorForm({ ...jugadorForm, numero: e.target.value === '' ? 0 : Number(e.target.value) }); }} disabled={editingJugador !== 'new' && !!editingJugador?.numero} style={editingJugador !== 'new' && editingJugador?.numero ? { background: 'var(--bg)', cursor: 'not-allowed' } : undefined} />
              </div>
              <div className="form-group">
                <label>Posición (opcional)</label>
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
                <label>CURP (opcional)</label>
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
            {/* Logo del equipo - solo capitán */}
            {selectedTorneo?.es_capitan && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <img
                  src={localTeamLogo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedTorneo?.equipo_nombre || '') + '&background=3b82f6&color=fff&size=48'}
                  alt=""
                  style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border)' }}
                />
                <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                  📷 {localTeamLogo ? 'Cambiar Logo' : 'Subir Logo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedTorneo) return;
                    try {
                      await api.uploadEquipoLogo(selectedTorneo.equipo_id, file);
                      const equipoData = await api.getEquipo(selectedTorneo.equipo_id);
                      setLocalTeamLogo((equipoData?.logo || '') + '?t=' + Date.now());
                      setToast({ message: 'Logo actualizado', type: 'success' });
                    } catch { setToast({ message: 'Error al subir logo', type: 'error' }); }
                    e.target.value = '';
                  }} />
                </label>
              </div>
            )}
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
          <>
            {/* Vista compacta para móvil */}
            <div className="standings-mobile">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                <span style={{ width: '1.5rem' }}>#</span>
                <span style={{ flex: 1 }}>Equipo</span>
                <span style={{ width: '2rem', textAlign: 'center' }}>PJ</span>
                <span style={{ width: '2rem', textAlign: 'center' }}>PG</span>
                <span style={{ width: '2rem', textAlign: 'center' }}>PP</span>
                <span style={{ width: '2.5rem', textAlign: 'center' }}>Pts</span>
              </div>
              {standings.map((row, i) => (
                <div key={row.equipo_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: row.equipo_id === selectedTorneo?.equipo_id ? 'var(--accent-light)' : i % 2 === 0 ? 'var(--bg)' : 'white', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent)', width: '1.5rem', textAlign: 'center' }}>{i + 1}</span>
                  <img src={getFileUrl(row.equipo_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(row.equipo_nombre) + '&background=6366f1&color=fff&size=22'} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => row.equipo_logo && setViewPhoto({ url: getFileUrl(row.equipo_logo)!, nombre: row.equipo_nombre })} />
                  <span style={{ flex: 1, fontWeight: 600, marginLeft: '0.4rem' }}>{row.equipo_nombre}{row.equipo_id === selectedTorneo?.equipo_id && <span style={{ fontSize: '0.6rem', color: 'var(--accent)', marginLeft: '0.2rem' }}>(tú)</span>}</span>
                  <span style={{ width: '2rem', textAlign: 'center' }}>{row.pj}</span>
                  <span style={{ width: '2rem', textAlign: 'center' }}>{row.pg}</span>
                  <span style={{ width: '2rem', textAlign: 'center' }}>{row.pp}</span>
                  <span style={{ width: '2.5rem', textAlign: 'center', fontWeight: 800, color: 'var(--accent)' }}>{row.pts}</span>
                </div>
              ))}
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                <p><strong>PJ</strong> = Jugados · <strong>PG</strong> = Ganados · <strong>PP</strong> = Perdidos · <strong>Pts</strong> = Puntos</p>
              </div>
            </div>

            {/* Vista tabla para desktop */}
            <div className="standings-desktop">
              <div className="table-wrapper">
                <table className="data-table standings-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th></th>
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
                        <td><img src={getFileUrl(row.equipo_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(row.equipo_nombre) + '&background=6366f1&color=fff&size=28'} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => row.equipo_logo && setViewPhoto({ url: getFileUrl(row.equipo_logo)!, nombre: row.equipo_nombre })} /></td>
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
              </div>
              <div className="standings-legend">
                <p><strong>PJ</strong> = Partidos Jugados · <strong>PG</strong> = Ganados · <strong>PP</strong> = Perdidos</p>
                <p><strong>SG</strong> = Sets Ganados · <strong>SP</strong> = Sets Perdidos · <strong>Pts</strong> = Puntos</p>
              </div>
            </div>
          </>
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

      {/* Estadísticas Modal */}
      <Modal open={showEstadisticas} onClose={() => setShowEstadisticas(false)} title={`Estadísticas — ${selectedTorneo?.equipo_nombre || ''}`} wide className="modal-dark">
        {loadingEstadisticas ? (
          <p>Cargando estadísticas...</p>
        ) : estadisticas ? (
          <div className="team-dashboard" style={{ margin: '-1.5rem', borderRadius: 0 }}>
            <div className="td-kpis">
              <div className="td-kpi"><span className="td-kpi-icon">👥</span><span className="td-kpi-label">Jugadores</span><span className="td-kpi-value">{estadisticas.total_jugadores}</span></div>
              <div className="td-kpi"><span className="td-kpi-icon">📅</span><span className="td-kpi-label">PJ</span><span className="td-kpi-value">{estadisticas.partidos_jugados}</span></div>
              <div className="td-kpi td-kpi-success"><span className="td-kpi-icon">🏆</span><span className="td-kpi-label">Ganados</span><span className="td-kpi-value">{estadisticas.partidos_ganados}</span></div>
              <div className="td-kpi td-kpi-danger"><span className="td-kpi-icon">❌</span><span className="td-kpi-label">Perdidos</span><span className="td-kpi-value">{estadisticas.partidos_perdidos}</span></div>
              <div className="td-kpi"><span className="td-kpi-icon">⭐</span><span className="td-kpi-label">Puntos</span><span className="td-kpi-value">{estadisticas.puntos_totales}</span></div>
            </div>
            <div className="td-section">
              <h4>Últimos partidos</h4>
              <div className="td-results">
                {(estadisticas.ultimos_resultados || []).map((r: string, i: number) => (
                  <span key={i} className={`td-result-circle ${r === 'G' ? 'win' : 'loss'}`}>{r}</span>
                ))}
              </div>
              {estadisticas.racha_actual > 0 && <p className="td-racha">🔥 Racha: {estadisticas.racha_actual} victorias</p>}
            </div>
            <div className="td-stats-grid" style={{ padding: '0 1.25rem', marginBottom: '1rem' }}>
              <div className="td-section" style={{ margin: 0 }}>
                <h4>Porcentaje de victorias</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: 80, height: 80 }}>
                    <svg width="80" height="80" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#donutGrad2)" strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${(estadisticas.porcentaje_victorias / 100) * 251.2} 251.2`}
                        transform="rotate(-90 50 50)" />
                      <defs><linearGradient id="donutGrad2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>{estadisticas.porcentaje_victorias.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="td-section" style={{ margin: 0 }}>
                <h4>Promedio</h4>
                <div className="td-promedio">
                  <span className="td-promedio-value">{estadisticas.promedio_puntos_partido.toFixed(2)}</span>
                  <span className="td-promedio-label">pts/partido</span>
                </div>
              </div>
            </div>
            <div className="td-section">
              <h4>Distribución por posición</h4>
              <div className="td-positions">
                {Object.entries(estadisticas.distribucion_posiciones || {}).map(([pos, count]) => (
                  <div key={pos} className="td-pos-row">
                    <span className="td-pos-name">{pos}</span>
                    <div className="td-pos-bar"><div style={{ width: `${((count as number) / estadisticas.total_jugadores) * 100}%` }} /></div>
                    <span className="td-pos-count">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sparkline de tendencia */}
            {estadisticas.ultimos_resultados?.length > 1 && (
              <div className="td-section">
                <h4>Tendencia</h4>
                <svg width="100%" height="70" viewBox={`0 0 ${(estadisticas.ultimos_resultados.length - 1) * 30 + 30} 70`} style={{ overflow: 'visible' }}>
                  {(() => {
                    const results: string[] = estadisticas.ultimos_resultados;
                    const chartW = (results.length - 1) * 30 + 30;
                    let acc = 0;
                    const points = results.map((r: string, i: number) => {
                      acc += r === 'G' ? 1 : -1;
                      return { x: i * 30 + 20, y: acc };
                    });
                    const maxY = Math.max(...points.map(p => Math.abs(p.y)), 1);
                    const normalized = points.map(p => ({ x: p.x, y: 35 - (p.y / maxY) * 25 }));
                    const pathD = normalized.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                    return (
                      <>
                        {/* Eje Y */}
                        <line x1="18" y1="8" x2="18" y2="62" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        <text x="14" y="13" textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.35)">+</text>
                        <text x="14" y="64" textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.35)">−</text>
                        {/* Eje X */}
                        <line x1="18" y1="62" x2={chartW} y2="62" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        {normalized.filter((_, i) => i % 2 === 0).map((p, i) => (
                          <text key={i} x={p.x} y="69" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.3)">{i * 2 + 1}</text>
                        ))}
                        {/* Línea base */}
                        <line x1="18" y1="35" x2={chartW} y2="35" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4" />
                        <path d={pathD} fill="none" stroke="url(#sparkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {normalized.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="3" fill={results[i] === 'G' ? '#10b981' : '#ef4444'} />
                        ))}
                        <defs><linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}

            {/* Puntos acumulados */}
            {estadisticas.puntos_acumulados?.length > 1 && (
              <div className="td-section">
                <h4>Evolución de puntos</h4>
                <svg width="100%" height="90" viewBox={`0 0 ${(estadisticas.puntos_acumulados.length - 1) * 30 + 30} 90`} style={{ overflow: 'visible' }}>
                  {(() => {
                    const pts: number[] = estadisticas.puntos_acumulados;
                    const maxPts = Math.max(...pts, 1);
                    const chartW = (pts.length - 1) * 30 + 30;
                    const points = pts.map((p: number, i: number) => ({ x: i * 30 + 20, y: 72 - (p / maxPts) * 58 }));
                    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                    const areaD = pathD + ` L${points[points.length - 1].x},72 L${points[0].x},72 Z`;
                    return (
                      <>
                        {/* Eje Y */}
                        <line x1="18" y1="10" x2="18" y2="72" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        <text x="14" y="16" textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.35)">{maxPts}</text>
                        <text x="14" y="74" textAnchor="end" fontSize="7" fill="rgba(255,255,255,0.35)">0</text>
                        {/* Eje X */}
                        <line x1="18" y1="72" x2={chartW} y2="72" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                        {points.filter((_, i) => i % 2 === 0).map((p, i) => (
                          <text key={i} x={p.x} y="82" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">J{i * 2 + 1}</text>
                        ))}
                        {/* Grid lines */}
                        <line x1="18" y1="40" x2={chartW} y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3" />
                        <path d={areaD} fill="url(#areaGrad)" opacity="0.3" />
                        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
                            {i === points.length - 1 && <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">{pts[i]}</text>}
                          </g>
                        ))}
                        <defs><linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No hay estadísticas disponibles.</p>
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
