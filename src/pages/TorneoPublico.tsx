import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Users, ClipboardList, Calendar, Share2, Moon, Sun } from 'lucide-react';
import { getFileUrl } from '@/services/api';
import { formatDate } from '@/utils/dateUtils';
import Modal from '@/components/ui/Modal';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface TorneoPublicoData {
  torneo: {
    id: number;
    nombre: string;
    periodo: string;
    categoria: string;
    logo: string;
  };
  tabla_posiciones: {
    equipo_id: number;
    equipo_nombre: string;
    pj: number;
    pg: number;
    pp: number;
    sg: number;
    sp: number;
    pts: number;
  }[];
  equipos: {
    id: number;
    uuid: string;
    nombre: string;
    logo: string;
    mostrar_publico: boolean;
    jugadores: {
      id: number;
      nombre: string;
      numero: number;
      posicion: string;
      es_capitan: boolean;
      foto: string | null;
      estatus: boolean;
      fecha_baja: string | null;
      asistencia_partidos?: number;
      asistencia_total_partidos?: number;
      asistencia_porcentaje?: number;
      asistencia_cumple?: boolean;
    }[];
    ultimas_asistencias: {
      partido_id: number;
      jornada_numero: number;
      fecha: string;
      rival: string;
      tipo: string | null;
      jugadores_presentes: { jugador_id: number; nombre: string; numero: number; foto: string | null; manual: boolean; es_capitan?: boolean }[];
      total_jugadores: number;
    }[];
    estadisticas: {
      total_jugadores: number;
      partidos_jugados: number;
      partidos_ganados: number;
      partidos_perdidos: number;
      puntos_totales: number;
      porcentaje_victorias: number;
      promedio_puntos_partido: number;
      ultimos_resultados: string[];
      racha_actual: number;
      distribucion_posiciones: Record<string, number>;
      puntos_acumulados: number[];
    } | null;
  }[];
  rol: {
    jornada_numero: number;
    jornada_fecha: string;
    partidos: {
      equipo_local_nombre: string;
      equipo_visitante_nombre: string;
      equipo_local_logo: string | null;
      equipo_visitante_logo: string | null;
      fecha_hora: string;
      ubicacion_nombre: string | null;
      ubicacion_direccion: string | null;
      ubicacion_url: string | null;
    }[];
  } | null;
}

type Tab = 'posiciones' | 'equipos' | 'asistencias' | 'rol';

export default function TorneoPublico() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TorneoPublicoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('posiciones');
  const [rolView, setRolView] = useState<'cancha' | 'equipo'>('equipo');
  const [rolBuscar, setRolBuscar] = useState('');
  const [rolUbicacion, setRolUbicacion] = useState<{ nombre: string; direccion: string | null; url: string | null } | null>(null);
  const [selectedEquipo, setSelectedEquipo] = useState<number | null>(null);
  const [teamResults, setTeamResults] = useState<{ partido_id: number; jornada_numero: number; fecha: string; tipo: string; equipo_local: string; equipo_local_logo: string | null; equipo_visitante: string; equipo_visitante_logo: string | null; puntos_local: number; puntos_visitante: number; resultado: string }[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsViewMode, setResultsViewMode] = useState<'cards' | 'list'>('cards');
  const [infoTooltip, setInfoTooltip] = useState<string | null>(null);
  const [viewPhoto, setViewPhoto] = useState<{ url: string; nombre: string; numero?: number; posicion?: string; equipo?: string; categoria?: string; equipoLogo?: string; tipo?: 'jugador' | 'equipo'; esCapitan?: boolean; asistenciaPartidos?: number; asistenciaTotalPartidos?: number; asistenciaPorcentaje?: number; asistenciaCumple?: boolean } | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => Math.random() > 0.5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/torneos/${id}/resumen`);
        if (!res.ok) throw new Error('Torneo no encontrado');
        const json = await res.json();
        if (json.equipos) json.equipos.sort(() => Math.random() - 0.5);
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Error al cargar');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Fetch team results when a team is selected
  useEffect(() => {
    if (!selectedEquipo || !data) { setTeamResults([]); return; }
    const eq = data.equipos.find(e => e.id === selectedEquipo);
    if (!eq?.uuid) { setTeamResults([]); return; }
    setLoadingResults(true);
    fetch(`${BASE_URL}/torneos/equipo/${eq.uuid}/resultados`)
      .then(r => r.ok ? r.json() : null)
      .then(json => setTeamResults(json?.resultados || []))
      .catch(() => setTeamResults([]))
      .finally(() => setLoadingResults(false));
  }, [selectedEquipo, data]);

  if (loading) {
    return (
      <div className="public-page">
        <div className="empty-state"><p>Cargando torneo...</p></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="public-page">
        <div className="empty-state">
          <Trophy size={48} />
          <p>{error || 'Torneo no encontrado'}</p>
        </div>
      </div>
    );
  }

  const { torneo, tabla_posiciones, equipos } = data;
  const selectedTeam = equipos.find(e => e.id === selectedEquipo);

  return (
    <div className={`public-page ${darkMode ? 'public-dark' : 'public-light'}`} style={{ padding: 0 }}>
      {/* Dark/Light Toggle */}
      <button onClick={() => setDarkMode(!darkMode)} className="public-theme-toggle" aria-label="Cambiar tema">
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {/* Hero Header */}
      <div className="public-hero">
        <div className="public-hero-content">
          {torneo.logo && (
            <img src={torneo.logo} alt="" className="public-hero-logo" />
          )}
          <div>
            <p className="public-hero-subtitle">{torneo.categoria}{torneo.periodo ? ` · ${torneo.periodo}` : ''}</p>
            <h1 className="public-hero-title">{torneo.nombre}</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="public-tabs">
        <button className={`public-tab ${activeTab === 'posiciones' ? 'active' : ''}`} onClick={() => setActiveTab('posiciones')}>
          <ClipboardList size={16} /> Posiciones
        </button>
        <button className={`public-tab ${activeTab === 'equipos' ? 'active' : ''}`} onClick={() => setActiveTab('equipos')}>
          <Users size={16} /> Estadísticas
        </button>
        <button className={`public-tab ${activeTab === 'asistencias' ? 'active' : ''}`} onClick={() => setActiveTab('asistencias')}>
          <Calendar size={16} /> Asistencias
        </button>
        <button className={`public-tab ${activeTab === 'rol' ? 'active' : ''}`} onClick={() => setActiveTab('rol')}>
          <ClipboardList size={16} /> Rol
        </button>
      </div>

      {/* Content */}
      <div className="public-content">
        {/* Tab: Posiciones */}
        {activeTab === 'posiciones' && (
          <div>
            <div className="public-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Tabla de Posiciones</h2>
              <button className="btn btn-sm btn-ghost" disabled={sharingLoading} onClick={async () => {
                setSharingLoading(true);
                try {
                  const rows = tabla_posiciones;
                  const rowHeight = 32;
                  const headerHeight = 80;
                  const tableHeaderHeight = 28;
                  const footerHeight = 50;
                  const padding = 16;
                  const width = 500;
                  const height = headerHeight + tableHeaderHeight + (rows.length * rowHeight) + footerHeight + padding * 2;

                  const canvas = document.createElement('canvas');
                  canvas.width = width * 2;
                  canvas.height = height * 2;
                  const ctx = canvas.getContext('2d')!;
                  ctx.scale(2, 2);

                  // Background
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, width, height);

                  // Header
                  const grad = ctx.createLinearGradient(0, 0, width, headerHeight);
                  grad.addColorStop(0, '#1e293b');
                  grad.addColorStop(1, '#0f172a');
                  ctx.fillStyle = grad;
                  ctx.fillRect(0, 0, width, headerHeight);

                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
                  ctx.fillText('TABLA DE POSICIONES', padding, 30);
                  ctx.fillStyle = '#e2e8f0';
                  ctx.font = '600 11px Inter, system-ui, sans-serif';
                  ctx.fillText(torneo.nombre, padding, 50);
                  ctx.fillStyle = '#94a3b8';
                  ctx.font = '10px Inter, system-ui, sans-serif';
                  ctx.fillText(`${torneo.categoria}${torneo.periodo ? ' · ' + torneo.periodo : ''}`, padding, 66);

                  // Table header
                  let y = headerHeight + padding;
                  ctx.fillStyle = '#1e293b';
                  ctx.fillRect(padding, y, width - padding * 2, tableHeaderHeight);
                  ctx.fillStyle = '#94a3b8';
                  ctx.font = '600 9px Inter, system-ui, sans-serif';
                  ctx.fillText('#', padding + 8, y + 18);
                  ctx.fillText('EQUIPO', padding + 35, y + 18);
                  ctx.fillText('PJ', padding + 320, y + 18);
                  ctx.fillText('PG', padding + 360, y + 18);
                  ctx.fillText('PP', padding + 400, y + 18);
                  ctx.fillText('PTS', padding + 435, y + 18);
                  y += tableHeaderHeight;

                  // Rows
                  rows.forEach((row, i) => {
                    ctx.fillStyle = i % 2 === 0 ? '#1e293b' : '#1f2937';
                    ctx.fillRect(padding, y, width - padding * 2, rowHeight);
                    ctx.fillStyle = i < 3 ? '#3b82f6' : '#64748b';
                    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
                    ctx.fillText(String(i + 1), padding + 10, y + 20);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '600 11px Inter, system-ui, sans-serif';
                    const name = row.equipo_nombre.length > 22 ? row.equipo_nombre.slice(0, 22) + '...' : row.equipo_nombre;
                    ctx.fillText(name, padding + 35, y + 20);
                    ctx.fillStyle = '#e2e8f0';
                    ctx.font = '11px Inter, system-ui, sans-serif';
                    ctx.fillText(String(row.pj), padding + 323, y + 20);
                    ctx.fillStyle = '#10b981';
                    ctx.fillText(String(row.pg), padding + 363, y + 20);
                    ctx.fillStyle = '#ef4444';
                    ctx.fillText(String(row.pp), padding + 403, y + 20);
                    ctx.fillStyle = '#f59e0b';
                    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
                    ctx.fillText(String(row.pts), padding + 437, y + 20);
                    y += rowHeight;
                  });

                  // Footer
                  y += 8;
                  ctx.fillStyle = '#64748b';
                  ctx.font = '9px Inter, system-ui, sans-serif';
                  ctx.fillText(`${window.location.origin}/torneo/${id}`, padding, y + 14);
                  ctx.fillStyle = '#94a3b8';
                  ctx.fillText('PJ=Jugados · PG=Ganados · PP=Perdidos · Pts=Puntos', padding, y + 30);
                  ctx.fillStyle = '#1e293b';
                  ctx.font = 'bold 10px Inter, system-ui, sans-serif';
                  ctx.textAlign = 'right';
                  ctx.fillText('TORNEALO SPORTS', width - padding, y + 14);
                  ctx.textAlign = 'left';

                  // Abrir en nueva pestaña
                  const dataUrl = canvas.toDataURL('image/png');
                  const w = window.open('');
                  if (w) {
                    w.document.write(`<html><head><title>Tabla de Posiciones</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9"><img src="${dataUrl}" style="max-width:100%;height:auto" /></body></html>`);
                    w.document.close();
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  setSharingLoading(false);
                }
              }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {sharingLoading ? '⏳' : <Share2 size={14} />} {sharingLoading ? 'Generando...' : 'Compartir'}
              </button>
            </div>
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
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla_posiciones.map((row, i) => (
                    <tr key={row.equipo_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedEquipo(row.equipo_id)}>
                      <td style={{ fontWeight: 800, color: i < 3 ? 'var(--accent)' : 'var(--text-secondary)' }}>{i + 1}</td>
                      <td>
                        {(() => {
                          const eq = equipos.find(e => e.id === row.equipo_id);
                          return <img src={getFileUrl(eq?.logo || '') || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(row.equipo_nombre) + '&background=6366f1&color=fff&size=24'} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => eq?.logo && setViewPhoto({ url: getFileUrl(eq.logo)!, nombre: row.equipo_nombre, equipo: row.equipo_nombre, equipoLogo: getFileUrl(eq.logo) || undefined, categoria: torneo.categoria, tipo: 'equipo' })} />;
                        })()}
                      </td>
                      <td><strong>{row.equipo_nombre}</strong></td>
                      <td>{row.pj}</td>
                      <td>{row.pg}</td>
                      <td>{row.pp}</td>
                      <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="standings-legend" style={{ padding: '0 0.5rem' }}>
              <p><strong>PJ</strong> = Jugados · <strong>PG</strong> = Ganados · <strong>PP</strong> = Perdidos · <strong>Pts</strong> = Puntos</p>
            </div>
          </div>
        )}

        {/* Tab: Equipos */}
        {activeTab === 'equipos' && (
          <div>
            <div className="public-section-header">
              <h2>Equipos ({equipos.length})</h2>
            </div>
            <div className="public-teams-grid">
              {equipos.map(eq => (
                <div key={eq.id} className="public-team-card" onClick={() => setSelectedEquipo(eq.id)}>
                  <img
                    src={getFileUrl(eq.logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(eq.nombre) + '&background=3b82f6&color=fff&size=48'}
                    alt=""
                    className="public-team-logo"
                    onClick={(e) => { e.stopPropagation(); if (eq.logo) setViewPhoto({ url: getFileUrl(eq.logo)!, nombre: eq.nombre, equipo: eq.nombre, equipoLogo: getFileUrl(eq.logo) || undefined, categoria: torneo.categoria, tipo: 'equipo' }); }}
                  />
                  <p className="public-team-name">{eq.nombre}</p>
                  <p className="public-team-count">{eq.jugadores.length} jugadores</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Asistencias */}
        {activeTab === 'asistencias' && (
          <div>
            <div className="public-section-header">
              <h2>Últimas Asistencias</h2>
            </div>
            {equipos.filter(eq => eq.ultimas_asistencias.length > 0).length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>Sin registros de asistencia aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {equipos.filter(eq => eq.ultimas_asistencias.length > 0).map(eq => (
                  <div key={eq.id} className="public-asistencia-card">
                    <div className="public-asistencia-header">
                      <img src={getFileUrl(eq.logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(eq.nombre) + '&background=3b82f6&color=fff&size=28'} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                      <strong>{eq.nombre}</strong>
                    </div>
                    {eq.ultimas_asistencias.map(a => (
                      <div key={a.partido_id} className="public-asistencia-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>vs {a.rival} <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 400 }}>· {a.tipo || ''}</span></span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>J{a.jornada_numero} · {formatDate(a.fecha)} {new Date(a.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {a.jugadores_presentes.map(j => (
                            <span key={j.jugador_id} style={{ background: 'var(--success-light)', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              {eq.mostrar_publico && (
                                <span style={{ position: 'relative', display: 'inline-flex' }}>
                                  <img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=10b981&color=fff&size=20'} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=10b981&color=fff&size=256', nombre: j.nombre, numero: j.numero, equipo: eq.nombre, equipoLogo: getFileUrl(eq.logo) || undefined, categoria: torneo.categoria, tipo: 'jugador', esCapitan: j.es_capitan })} />
                                  {j.es_capitan && <span style={{ position: 'absolute', top: -6, left: -6, background: '#f59e0b', color: 'white', fontSize: '0.55rem', fontWeight: 800, width: 13, height: 13, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, border: '1.5px solid white' }}>C</span>}
                                </span>
                              )}
                              {j.nombre.split(' ')[0]}{j.numero ? ` #${j.numero}` : ''}{j.manual && <sup style={{ fontSize: '0.55rem', color: '#64748b', marginLeft: '2px' }}>M</sup>}
                            </span>
                          ))}
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{a.jugadores_presentes.length}/{a.total_jugadores} presentes</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Rol */}
        {activeTab === 'rol' && (
          <div>
            <div className="public-section-header">
              <h2>Rol de Juegos</h2>
            </div>
            {!data.rol ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No hay jornadas pendientes.</p>
            ) : (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Jornada {data.rol.jornada_numero}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>{formatDate(data.rol.jornada_fecha)}</p>
                  <div style={{ display: 'inline-flex', gap: '0.25rem', background: 'var(--bg)', borderRadius: '20px', padding: '0.2rem' }}>
                    <button onClick={() => setRolView('equipo')} style={{ padding: '0.3rem 0.75rem', borderRadius: '16px', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: rolView === 'equipo' ? 'var(--accent)' : 'transparent', color: rolView === 'equipo' ? 'white' : 'var(--text-secondary)' }}>Por equipo</button>
                    <button onClick={() => setRolView('cancha')} style={{ padding: '0.3rem 0.75rem', borderRadius: '16px', border: 'none', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: rolView === 'cancha' ? 'var(--accent)' : 'transparent', color: rolView === 'cancha' ? 'white' : 'var(--text-secondary)' }}>Por cancha</button>
                  </div>
                </div>

                {/* Vista por cancha */}
                {rolView === 'cancha' && (() => {
                  let lastUbicacion: string | null | undefined = undefined;
                  return data.rol!.partidos.map((p, i) => {
                    const showHeader = p.ubicacion_nombre !== lastUbicacion;
                    lastUbicacion = p.ubicacion_nombre;
                    return (
                      <div key={i}>
                        {showHeader && (
                          <div style={{ padding: '0.6rem 0', marginTop: i > 0 ? '1rem' : 0, borderBottom: '1px solid var(--border)' }}>
                            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>📍 {p.ubicacion_nombre || 'Sin ubicación'}</p>
                            {p.ubicacion_direccion && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.ubicacion_direccion}</p>}
                            {p.ubicacion_url && <a href={p.ubicacion_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.65rem', color: 'var(--accent)', textDecoration: 'underline' }}>Ver mapa</a>}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', gap: '0.5rem' }}>
                          <img
                            src={getFileUrl(p.equipo_local_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.equipo_local_nombre) + '&background=3b82f6&color=fff&size=36'}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                          />
                          <span style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem', textAlign: 'right' }}>{p.equipo_local_nombre}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', padding: '0 0.4rem' }}>vs</span>
                          <span style={{ flex: 1, fontWeight: 700, fontSize: '0.85rem' }}>{p.equipo_visitante_nombre}</span>
                          <img
                            src={getFileUrl(p.equipo_visitante_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.equipo_visitante_nombre) + '&background=8b5cf6&color=fff&size=36'}
                            alt=""
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
                          />
                          <span style={{ minWidth: 50, textAlign: 'right', fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                            {p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}

                {/* Vista por equipo */}
                {rolView === 'equipo' && (() => {
                  // Generar lista: cada equipo con su(s) partido(s)
                  const equipoMap = new Map<string, { logo: string | null; partidos: { rival: string; rivalLogo: string | null; hora: string; cancha: string; canchaDir: string | null; canchaUrl: string | null }[] }>();
                  data.rol!.partidos.forEach(p => {
                    // Local
                    if (!equipoMap.has(p.equipo_local_nombre)) equipoMap.set(p.equipo_local_nombre, { logo: p.equipo_local_logo, partidos: [] });
                    equipoMap.get(p.equipo_local_nombre)!.partidos.push({ rival: p.equipo_visitante_nombre, rivalLogo: p.equipo_visitante_logo, hora: p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', cancha: p.ubicacion_nombre || '—', canchaDir: p.ubicacion_direccion, canchaUrl: p.ubicacion_url });
                    // Visitante
                    if (!equipoMap.has(p.equipo_visitante_nombre)) equipoMap.set(p.equipo_visitante_nombre, { logo: p.equipo_visitante_logo, partidos: [] });
                    equipoMap.get(p.equipo_visitante_nombre)!.partidos.push({ rival: p.equipo_local_nombre, rivalLogo: p.equipo_local_logo, hora: p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—', cancha: p.ubicacion_nombre || '—', canchaDir: p.ubicacion_direccion, canchaUrl: p.ubicacion_url });
                  });
                  const filtered = [...equipoMap.entries()].filter(([nombre]) => nombre.toLowerCase().includes(rolBuscar.toLowerCase())).sort((a, b) => a[0].localeCompare(b[0]));
                  return (
                    <>
                      <input
                        type="text"
                        value={rolBuscar}
                        onChange={e => setRolBuscar(e.target.value)}
                        placeholder="Buscar equipo..."
                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '0.75rem' }}
                      />
                      {filtered.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.85rem' }}>No se encontró el equipo.</p>
                      ) : filtered.map(([nombre, info]) => (
                        <div key={nombre} style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '0.5rem', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <img
                              src={getFileUrl(info.logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(nombre) + '&background=3b82f6&color=fff&size=32'}
                              alt=""
                              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <strong style={{ fontSize: '0.9rem' }}>{nombre}</strong>
                          </div>
                          {info.partidos.map((partido, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0 0.3rem 2.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <span>vs <strong style={{ color: 'var(--text-primary)' }}>{partido.rival}</strong></span>
                              <span>·</span>
                              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{partido.hora}</span>
                              <span>·</span>
                              <span style={{ cursor: 'pointer', background: 'var(--bg)', padding: '0.15rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem' }} onClick={() => setRolUbicacion({ nombre: partido.cancha, direccion: partido.canchaDir, url: partido.canchaUrl })}>{partido.cancha} ›</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal detalle equipo - Dashboard */}
      <Modal open={!!selectedTeam} onClose={() => setSelectedEquipo(null)} title="" extraWide className={darkMode ? 'modal-dark' : ''}>
        {selectedTeam && (
          <div className="team-dashboard">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <img src={getFileUrl(selectedTeam.logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedTeam.nombre) + '&background=3b82f6&color=fff&size=72'} alt="" style={{ width: 72, height: 72, borderRadius: '16px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} onClick={() => selectedTeam.logo && setViewPhoto({ url: getFileUrl(selectedTeam.logo)!, nombre: selectedTeam.nombre, equipo: selectedTeam.nombre, equipoLogo: getFileUrl(selectedTeam.logo) || undefined, categoria: torneo.categoria, tipo: 'equipo' })} />
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', margin: 0, textTransform: 'uppercase' }}>{selectedTeam.nombre}</h2>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, marginTop: '0.2rem' }}>{torneo.categoria} · {torneo.periodo}</p>
                {selectedTeam.estadisticas && (
                  <span style={{ display: 'inline-block', marginTop: '0.4rem', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 700 }}>
                    {tabla_posiciones.findIndex(r => r.equipo_id === selectedTeam.id) + 1}° lugar
                  </span>
                )}
              </div>
            </div>

            {/* KPIs */}
            {selectedTeam.estadisticas ? (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: '12px', padding: '0.6rem 0.3rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.1rem' }}>👥</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', display: 'block' }}>{selectedTeam.estadisticas.total_jugadores}</span>
                <span style={{ fontSize: '0.5rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Jugadores</span>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', borderRadius: '12px', padding: '0.6rem 0.3rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.1rem' }}>📅</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', display: 'block' }}>{selectedTeam.estadisticas.partidos_jugados}</span>
                <span style={{ fontSize: '0.5rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Jugados</span>
              </div>
              <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '12px', padding: '0.6rem 0.3rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.1rem' }}>🏆</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', display: 'block' }}>{selectedTeam.estadisticas.partidos_ganados}</span>
                <span style={{ fontSize: '0.5rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Ganados</span>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '12px', padding: '0.6rem 0.3rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.1rem' }}>❌</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444', display: 'block' }}>{selectedTeam.estadisticas.partidos_perdidos}</span>
                <span style={{ fontSize: '0.5rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Perdidos</span>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '0.6rem 0.3rem', textAlign: 'center' }}>
                <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.1rem' }}>⭐</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b', display: 'block' }}>{selectedTeam.estadisticas.puntos_totales}</span>
                <span style={{ fontSize: '0.5rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Puntos</span>
              </div>
            </div>

            {/* Últimos Partidos - Cards scrolleables */}
            {loadingResults ? (
              <div className="td-section"><p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Cargando partidos...</p></div>
            ) : teamResults.length > 0 && (
              <div className="td-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}>Últimos Partidos</h4>
                  <button onClick={() => setResultsViewMode(resultsViewMode === 'cards' ? 'list' : 'cards')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                    {resultsViewMode === 'cards' ? 'Ver todos ›' : '‹ Cards'}
                  </button>
                </div>
                {resultsViewMode === 'cards' ? (
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {teamResults.map(r => (
                    <div key={r.partido_id} style={{ minWidth: 130, background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '0.6rem', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                      <p style={{ fontSize: '0.55rem', color: '#94a3b8', margin: 0, textAlign: 'center', marginBottom: '0.4rem' }}>J{r.jornada_numero}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                        <img src={getFileUrl(r.equipo_local_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.equipo_local) + '&background=3b82f6&color=fff&size=20'} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.55rem', color: '#64748b' }}>vs</span>
                        <img src={getFileUrl(r.equipo_visitante_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.equipo_visitante) + '&background=8b5cf6&color=fff&size=20'} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                      </div>
                      <p style={{ fontSize: '1rem', fontWeight: 800, color: r.resultado === 'G' ? '#10b981' : '#ef4444', margin: 0, textAlign: 'center' }}>{r.puntos_local} - {r.puntos_visitante}</p>
                      <p style={{ fontSize: '0.5rem', color: '#94a3b8', margin: 0, textAlign: 'center', marginTop: '0.2rem' }}>{r.equipo_local.length > 10 ? r.equipo_local.slice(0,10) + '..' : r.equipo_local} vs {r.equipo_visitante.length > 10 ? r.equipo_visitante.slice(0,10) + '..' : r.equipo_visitante}</p>
                    </div>
                  ))}
                </div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {teamResults.map(r => (
                    <div key={r.partido_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', borderRadius: '8px', background: r.resultado === 'G' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)', border: `1px solid ${r.resultado === 'G' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)'}` }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b' }}>J{r.jornada_numero}</span>
                        <span style={{ fontSize: '0.45rem', color: '#4b5563' }}>{r.fecha ? formatDate(r.fecha) : ''}</span>
                      </div>
                      <img src={getFileUrl(r.equipo_local_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.equipo_local) + '&background=3b82f6&color=fff&size=18'} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.equipo_local}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'white', minWidth: 40, textAlign: 'center' }}>{r.puntos_local}-{r.puntos_visitante}</span>
                      <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: 600, color: '#e2e8f0', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.equipo_visitante}</span>
                      <img src={getFileUrl(r.equipo_visitante_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.equipo_visitante) + '&background=8b5cf6&color=fff&size=18'} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}

            {/* Stats grid 2x2 compacto con expand */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              {/* Porcentaje de victorias */}
              <div style={{ background: 'linear-gradient(145deg, #111d33 0%, #0d1a2d 100%)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(16,185,129,0.12)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
                <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.6rem' }}>% Victorias</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                    <svg width="56" height="56" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#donutGrad)" strokeWidth="14" strokeLinecap="round"
                        strokeDasharray={`${(selectedTeam.estadisticas.porcentaje_victorias / 100) * 251.2} 251.2`}
                        transform="rotate(-90 50 50)" />
                      <defs><linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white' }}>{selectedTeam.estadisticas.porcentaje_victorias.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{selectedTeam.estadisticas.partidos_ganados}G</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                      <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>{selectedTeam.estadisticas.partidos_perdidos}P</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promedio de puntos */}
              <div style={{ background: 'linear-gradient(145deg, #111d33 0%, #0d1a2d 100%)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(59,130,246,0.12)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -15, right: -15, width: 60, height: 60, background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
                <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Promedio <span onClick={(e) => { e.stopPropagation(); setInfoTooltip('Puntos promedio obtenidos por partido jugado. Se calcula dividiendo los puntos totales entre los partidos jugados.'); }} style={{ cursor: 'pointer', width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(148,163,184,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: 'rgba(148,163,184,0.5)', fontStyle: 'italic', fontWeight: 400 }}>i</span></p>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', display: 'block', lineHeight: 1 }}>{selectedTeam.estadisticas.promedio_puntos_partido.toFixed(2)}</span>
                <span style={{ fontSize: '0.55rem', color: '#64748b' }}>pts/partido</span>
                {selectedTeam.estadisticas.puntos_acumulados?.length > 1 && (
                  <svg width="100%" height="28" viewBox={`0 0 ${(selectedTeam.estadisticas.puntos_acumulados.length - 1) * 18 + 18} 28`} style={{ marginTop: '0.4rem', display: 'block' }}>
                    {(() => {
                      const pts = selectedTeam.estadisticas.puntos_acumulados;
                      const maxPts = Math.max(...pts, 1);
                      const points = pts.map((p, i) => ({ x: i * 18 + 9, y: 24 - (p / maxPts) * 20 }));
                      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                      const areaD = pathD + ` L${points[points.length - 1].x},26 L${points[0].x},26 Z`;
                      return (<><path d={areaD} fill="url(#areaG)" opacity="0.25" /><path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" /><defs><linearGradient id="areaG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs></>);
                    })()}
                  </svg>
                )}
              </div>

              {/* Efectividad - Heatmap */}
              {selectedTeam.estadisticas.puntos_acumulados?.length > 1 && (
              <div style={{ background: 'linear-gradient(145deg, #111d33 0%, #0d1a2d 100%)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(16,185,129,0.08)', position: 'relative', overflow: 'hidden' }}>
                <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Efectividad por partido <span onClick={(e) => { e.stopPropagation(); setInfoTooltip('Muestra los puntos obtenidos en cada partido. Colores: rojo oscuro (0 pts), rojo (1 pt), amarillo (2 pts), verde (3 pts).'); }} style={{ cursor: 'pointer', width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(148,163,184,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: 'rgba(148,163,184,0.5)', fontStyle: 'italic', fontWeight: 400 }}>i</span></p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {(() => {
                    const pts = selectedTeam.estadisticas.puntos_acumulados;
                    const perGame = pts.map((p, i) => i === 0 ? p : p - pts[i - 1]);
                    const colors = ['#7f1d1d', '#dc2626', '#f59e0b', '#10b981'];
                    return perGame.map((p, i) => (
                      <div key={i} style={{ width: 18, height: 18, borderRadius: 4, background: colors[Math.min(p, 3)], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'white', opacity: 0.9 }}>{p}</span>
                      </div>
                    ));
                  })()}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.45rem', color: '#64748b' }}>Bajo</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {['#7f1d1d', '#dc2626', '#f59e0b', '#10b981'].map((c, i) => (
                      <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.45rem', color: '#64748b' }}>Alto</span>
                </div>
              </div>
              )}

              {/* Posición en el torneo */}
              <div style={{ background: 'linear-gradient(145deg, #111d33 0%, #0d1a2d 100%)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(245,158,11,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.5rem', alignSelf: 'flex-start' }}>Posición</p>
                {(() => {
                  const pos = tabla_posiciones.findIndex(r => r.equipo_id === selectedTeam.id) + 1;
                  const total = tabla_posiciones.length;
                  const pct = ((total - pos) / (total - 1)) * 100;
                  const color = '#3b82f6';
                  return (
                    <>
                      <div style={{ position: 'relative', width: '100%', height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'visible', marginBottom: '0.5rem' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 6 }} />
                        <div style={{ position: 'absolute', top: -4, left: `${pct}%`, transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0d1a2d' }}>
                          <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'white' }}>{pos}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ fontSize: '0.45rem', color: '#64748b' }}>#{total}</span>
                        <span style={{ fontSize: '0.55rem', fontWeight: 700, color }}>#{pos} de {total}</span>
                        <span style={{ fontSize: '0.45rem', color: '#64748b' }}>#1</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Racha histórica */}
              {selectedTeam.estadisticas.ultimos_resultados?.length > 1 && (
              <div style={{ background: 'linear-gradient(145deg, #111d33 0%, #0d1a2d 100%)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(245,158,11,0.08)' }}>
                <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Rachas <span onClick={(e) => { e.stopPropagation(); setInfoTooltip('Rachas consecutivas de victorias (verde) y derrotas (rojo). El ancho y alto de cada bloque indica cuántos partidos duró la racha.'); }} style={{ cursor: 'pointer', width: 14, height: 14, borderRadius: '50%', border: '1px solid rgba(148,163,184,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', color: 'rgba(148,163,184,0.5)', fontStyle: 'italic', fontWeight: 400 }}>i</span></p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1px', height: 35 }}>
                  {(() => {
                    const results = selectedTeam.estadisticas.ultimos_resultados;
                    const rachas: { tipo: string; len: number }[] = [];
                    let current = results[0]; let count = 1;
                    for (let i = 1; i < results.length; i++) {
                      if (results[i] === current) { count++; } else { rachas.push({ tipo: current, len: count }); current = results[i]; count = 1; }
                    }
                    rachas.push({ tipo: current, len: count });
                    const maxLen = Math.max(...rachas.map(r => r.len), 1);
                    return rachas.map((r, i) => (
                      <div key={i} style={{ flex: r.len, height: `${(r.len / maxLen) * 100}%`, minHeight: 6, background: r.tipo === 'G' ? '#10b981' : '#ef4444', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'white' }}>{r.len}</span>
                      </div>
                    ));
                  })()}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.5rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><span style={{ width: 6, height: 6, background: '#10b981', borderRadius: 2 }} />Victorias</span>
                  <span style={{ fontSize: '0.5rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><span style={{ width: 6, height: 6, background: '#ef4444', borderRadius: 2 }} />Derrotas</span>
                </div>
              </div>
              )}

              {/* Distribución por posición */}
              <div style={{ background: 'linear-gradient(145deg, #111d33 0%, #0d1a2d 100%)', borderRadius: '16px', padding: '1rem', border: '1px solid rgba(59,130,246,0.08)' }}>
                <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.5rem' }}>Posiciones</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {Object.entries(selectedTeam.estadisticas.distribucion_posiciones).map(([pos, count]) => (
                    <div key={pos} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.55rem', color: '#94a3b8', width: 55, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pos}</span>
                      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(count / selectedTeam.estadisticas!.total_jugadores) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'white', width: 16 }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ranking del torneo */}
            <div className="td-section">
              <h4>Ranking del torneo</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {tabla_posiciones.slice(0, 5).map((row, i) => {
                  const eq = equipos.find(e => e.id === row.equipo_id);
                  const isMe = row.equipo_id === selectedTeam.id;
                  return (
                    <div key={row.equipo_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '8px', background: isMe ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)', border: isMe ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: i < 3 ? '#f59e0b' : '#64748b', width: 18 }}>{i + 1}</span>
                      <img src={getFileUrl(eq?.logo || '') || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(row.equipo_nombre) + '&background=3b82f6&color=fff&size=20'} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: isMe ? 800 : 500, color: isMe ? 'white' : '#cbd5e1' }}>{row.equipo_nombre}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isMe ? '#3b82f6' : '#94a3b8' }}>{row.pts} pts</span>
                    </div>
                  );
                })}
                {/* Si el equipo no está en top 5, mostrarlo con separador */}
                {tabla_posiciones.findIndex(r => r.equipo_id === selectedTeam.id) >= 5 && (() => {
                  const idx = tabla_posiciones.findIndex(r => r.equipo_id === selectedTeam.id);
                  const row = tabla_posiciones[idx];
                  const eq = equipos.find(e => e.id === row.equipo_id);
                  return (
                    <>
                      <div style={{ textAlign: 'center', padding: '0.2rem 0', color: '#64748b', fontSize: '0.7rem', letterSpacing: '2px' }}>•••</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', width: 18 }}>{idx + 1}</span>
                        <img src={getFileUrl(eq?.logo || '') || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(row.equipo_nombre) + '&background=3b82f6&color=fff&size=20'} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                        <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>{row.equipo_nombre}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>{row.pts} pts</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Plantilla */}
            <div className="td-section">
              <h4>Plantilla ({selectedTeam.jugadores.filter(j => j.estatus).length})</h4>
              <div className="td-plantilla">
                {selectedTeam.jugadores.map(j => (
                  <div key={j.id} className="td-player" style={{ opacity: j.estatus ? 1 : 0.45 }} onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=256', nombre: j.nombre, numero: j.numero, posicion: j.posicion, equipo: selectedTeam.nombre, equipoLogo: getFileUrl(selectedTeam.logo) || undefined, categoria: torneo.categoria, tipo: 'jugador', esCapitan: j.es_capitan, asistenciaPartidos: j.asistencia_partidos, asistenciaTotalPartidos: j.asistencia_total_partidos, asistenciaPorcentaje: j.asistencia_porcentaje, asistenciaCumple: j.asistencia_cumple })}>
                    <div className="td-player-photo-wrap">
                      <img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=48'} alt="" className="td-player-photo" />
                      {j.numero && <span className="td-player-number">{j.numero}</span>}
                      {j.es_capitan && <span className="td-player-captain">C</span>}
                      {j.asistencia_porcentaje != null && (
                        <span className="td-player-attendance" style={{ color: j.asistencia_cumple ? '#10b981' : '#f59e0b' }}>{j.asistencia_porcentaje.toFixed(0)}%</span>
                      )}
                    </div>
                    <span className="td-player-name">{j.nombre.split(' ')[0]}</span>
                    {!j.estatus ? (
                      <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 600 }}>BAJA {j.fecha_baja ? formatDate(j.fecha_baja) : ''}</span>
                    ) : (
                      <span className="td-player-pos">{j.posicion || '—'}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            </>
            ) : (
              <div className="td-section" style={{ marginTop: '1rem' }}>
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>Este equipo tiene su perfil privado</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* View Photo Modal - Player Card */}
      <Modal open={!!viewPhoto} onClose={() => { setViewPhoto(null); setExpandedPhoto(false); }} title="" className={`${darkMode ? 'modal-dark' : ''} modal-player-card`}>
        {viewPhoto && (
          <div className="player-card">
            {expandedPhoto && (
              <div className="player-card-expanded" onClick={() => setExpandedPhoto(false)}>
                <img src={viewPhoto.url} alt={viewPhoto.nombre} />
              </div>
            )}
            <div className="player-card-body">
              <div className="player-card-photo-col">
                <img src={viewPhoto.url} alt={viewPhoto.nombre} className="player-card-photo" style={{ cursor: 'pointer' }} onClick={() => setExpandedPhoto(true)} />
              </div>
              <div className="player-card-info-col">
                <h3 className="player-card-name">{viewPhoto.nombre}</h3>
                <span className="player-card-badge">
                  {viewPhoto.tipo === 'jugador' ? '⚽ JUGADOR(A)' : '🏐 EQUIPO'}
                </span>
                {viewPhoto.esCapitan && (
                  <span className="player-card-badge player-card-badge-captain">👑 CAPITÁN(A)</span>
                )}
                {viewPhoto.numero !== undefined && (
                  <div className="player-card-row">
                    <span className="player-card-row-icon">🏅</span>
                    <div>
                      <span className="player-card-row-label">NÚMERO</span>
                      <span className="player-card-row-value">{viewPhoto.numero}</span>
                    </div>
                  </div>
                )}
                {viewPhoto.posicion && (
                  <div className="player-card-row">
                    <span className="player-card-row-icon">📍</span>
                    <div>
                      <span className="player-card-row-label">POSICIÓN</span>
                      <span className="player-card-row-value">{viewPhoto.posicion}</span>
                    </div>
                  </div>
                )}
                {viewPhoto.equipo && (
                  <div className="player-card-row">
                    <span className="player-card-row-icon">🏐</span>
                    <div>
                      <span className="player-card-row-label">EQUIPO</span>
                      <span className="player-card-row-value">{viewPhoto.equipo}</span>
                    </div>
                  </div>
                )}
                {viewPhoto.categoria && (
                  <div className="player-card-row">
                    <span className="player-card-row-icon">⭐</span>
                    <div>
                      <span className="player-card-row-label">CATEGORÍA</span>
                      <span className="player-card-row-value">{viewPhoto.categoria}</span>
                    </div>
                  </div>
                )}
                {viewPhoto.asistenciaPorcentaje != null && (
                  <div className="player-card-row">
                    <span className="player-card-row-icon">📋</span>
                    <div>
                      <span className="player-card-row-label">ASISTENCIA</span>
                      <span className="player-card-row-value" style={{ color: viewPhoto.asistenciaCumple ? '#10b981' : '#f59e0b' }}>
                        {viewPhoto.asistenciaPorcentaje.toFixed(0)}% {viewPhoto.asistenciaCumple ? '✓' : '✗'}
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '0.4rem' }}>
                          ({viewPhoto.asistenciaPartidos}/{viewPhoto.asistenciaTotalPartidos})
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="player-card-footer">
              {torneo.logo && <img src={torneo.logo} alt="" className="player-card-footer-logo" />}
              <div>
                <span className="player-card-footer-league">{torneo.nombre}</span>
                {viewPhoto.equipo && viewPhoto.tipo === 'jugador' && <span className="player-card-footer-team">{viewPhoto.equipo}</span>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Ubicacion Modal */}
      <Modal open={!!rolUbicacion} onClose={() => setRolUbicacion(null)} title={rolUbicacion?.nombre || 'Ubicación'}>
        {rolUbicacion && (
          <div>
            <p style={{ marginBottom: '0.5rem' }}><strong>Nombre:</strong> {rolUbicacion.nombre}</p>
            {rolUbicacion.direccion && <p style={{ marginBottom: '0.75rem' }}><strong>Dirección:</strong> {rolUbicacion.direccion}</p>}
            {rolUbicacion.url && (
              <a href={rolUbicacion.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary" style={{ textDecoration: 'none' }}>
                📍 Ver en Google Maps
              </a>
            )}
          </div>
        )}
      </Modal>

      {/* Info Tooltip */}
      {infoTooltip && (
        <div onClick={() => setInfoTooltip(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111d33', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.25rem', maxWidth: 280, color: '#e2e8f0', fontSize: '0.8rem', lineHeight: 1.5, textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <p style={{ margin: '0 0 1rem' }}>{infoTooltip}</p>
            <button onClick={() => setInfoTooltip(null)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem 1.25rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Entendido</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="public-footer">
        <a href="/login">Tornealo Sports</a>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '0.5rem' }}>v{import.meta.env.VITE_APP_VERSION}</span>
      </div>
    </div>
  );
}
