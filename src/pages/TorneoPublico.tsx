import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Users, ClipboardList, Calendar, Share2 } from 'lucide-react';
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
  const [viewPhoto, setViewPhoto] = useState<{ url: string; nombre: string; numero?: number; posicion?: string; equipo?: string; categoria?: string; equipoLogo?: string; tipo?: 'jugador' | 'equipo'; esCapitan?: boolean; asistenciaPartidos?: number; asistenciaTotalPartidos?: number; asistenciaPorcentaje?: number; asistenciaCumple?: boolean } | null>(null);
  const [expandedPhoto, setExpandedPhoto] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

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
    <div className="public-page" style={{ padding: 0, background: 'white' }}>
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
          <Users size={16} /> Equipos
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
      <Modal open={!!selectedTeam} onClose={() => setSelectedEquipo(null)} title="" extraWide className="modal-dark">
        {selectedTeam && (
          <div className="team-dashboard">
            {/* Header */}
            <div className="td-header">
              <img src={getFileUrl(selectedTeam.logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedTeam.nombre) + '&background=3b82f6&color=fff&size=56'} alt="" className="td-header-logo" onClick={() => selectedTeam.logo && setViewPhoto({ url: getFileUrl(selectedTeam.logo)!, nombre: selectedTeam.nombre, equipo: selectedTeam.nombre, equipoLogo: getFileUrl(selectedTeam.logo) || undefined, categoria: torneo.categoria, tipo: 'equipo' })} />
              <div>
                <h2 className="td-header-name">{selectedTeam.nombre}</h2>
                <p className="td-header-meta">{torneo.categoria} · {torneo.periodo}</p>
              </div>
            </div>

            {/* KPIs - solo si hay estadisticas */}
            {selectedTeam.estadisticas ? (
            <>
            <div className="td-kpis">
              <div className="td-kpi"><span className="td-kpi-icon">👥</span><span className="td-kpi-label">Jugadores</span><span className="td-kpi-value">{selectedTeam.estadisticas.total_jugadores}</span></div>
              <div className="td-kpi"><span className="td-kpi-icon">📅</span><span className="td-kpi-label">Partidos jugados</span><span className="td-kpi-value">{selectedTeam.estadisticas.partidos_jugados}</span></div>
              <div className="td-kpi td-kpi-success"><span className="td-kpi-icon">🏆</span><span className="td-kpi-label">Ganados</span><span className="td-kpi-value">{selectedTeam.estadisticas.partidos_ganados}</span></div>
              <div className="td-kpi td-kpi-danger"><span className="td-kpi-icon">❌</span><span className="td-kpi-label">Perdidos</span><span className="td-kpi-value">{selectedTeam.estadisticas.partidos_perdidos}</span></div>
              <div className="td-kpi"><span className="td-kpi-icon">⭐</span><span className="td-kpi-label">Puntos totales</span><span className="td-kpi-value">{selectedTeam.estadisticas.puntos_totales}</span></div>
            </div>

            {/* Últimos resultados */}
            <div className="td-section">
              <h4>Últimos partidos</h4>
              <div className="td-results">
                {selectedTeam.estadisticas.ultimos_resultados.map((r, i) => (
                  <span key={i} className={`td-result-circle ${r === 'G' ? 'win' : 'loss'}`}>{r}</span>
                ))}
              </div>
              {selectedTeam.estadisticas.racha_actual > 0 && (
                <p className="td-racha">🔥 Racha actual: {selectedTeam.estadisticas.racha_actual} victorias</p>
              )}
            </div>

            {/* Stats grid */}
            <div className="td-stats-grid">
              {/* Porcentaje de victorias - Donut */}
              <div className="td-section">
                <h4>Porcentaje de victorias</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: 100, height: 100 }}>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#donutGrad)" strokeWidth="12" strokeLinecap="round"
                        strokeDasharray={`${(selectedTeam.estadisticas.porcentaje_victorias / 100) * 251.2} 251.2`}
                        transform="rotate(-90 50 50)" />
                      <defs><linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>{selectedTeam.estadisticas.porcentaje_victorias.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Victorias {selectedTeam.estadisticas.partidos_ganados} ({selectedTeam.estadisticas.porcentaje_victorias.toFixed(1)}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Derrotas {selectedTeam.estadisticas.partidos_perdidos} ({(100 - selectedTeam.estadisticas.porcentaje_victorias).toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribución por posición */}
              <div className="td-section">
                <h4>Distribución por posición</h4>
                <div className="td-positions">
                  {Object.entries(selectedTeam.estadisticas.distribucion_posiciones).map(([pos, count]) => (
                    <div key={pos} className="td-pos-row">
                      <span className="td-pos-name">{pos}</span>
                      <div className="td-pos-bar"><div style={{ width: `${(count / selectedTeam.estadisticas!.total_jugadores) * 100}%` }} /></div>
                      <span className="td-pos-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Promedio */}
              <div className="td-section">
                <h4>Promedio</h4>
                <div className="td-promedio">
                  <span className="td-promedio-value">{selectedTeam.estadisticas.promedio_puntos_partido.toFixed(2)}</span>
                  <span className="td-promedio-label">pts/partido</span>
                </div>
              </div>
            </div>

            {/* Sparkline de tendencia */}
            {selectedTeam.estadisticas.ultimos_resultados?.length > 1 && (
              <div className="td-section">
                <h4>Tendencia</h4>
                <svg width="100%" height="70" viewBox={`0 0 ${(selectedTeam.estadisticas.ultimos_resultados.length - 1) * 30 + 30} 70`} style={{ overflow: 'visible' }}>
                  {(() => {
                    const results = selectedTeam.estadisticas.ultimos_resultados;
                    const chartW = (results.length - 1) * 30 + 30;
                    let acc = 0;
                    const points = results.map((r, i) => {
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
                        <path d={pathD} fill="none" stroke="url(#sparkGradPub)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {normalized.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="3" fill={results[i] === 'G' ? '#10b981' : '#ef4444'} />
                        ))}
                        <defs><linearGradient id="sparkGradPub" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}

            {/* Puntos acumulados */}
            {selectedTeam.estadisticas.puntos_acumulados?.length > 1 && (
              <div className="td-section">
                <h4>Evolución de puntos</h4>
                <svg width="100%" height="90" viewBox={`0 0 ${(selectedTeam.estadisticas.puntos_acumulados.length - 1) * 30 + 30} 90`} style={{ overflow: 'visible' }}>
                  {(() => {
                    const pts: number[] = selectedTeam.estadisticas.puntos_acumulados;
                    const maxPts = Math.max(...pts, 1);
                    const chartW = (pts.length - 1) * 30 + 30;
                    const points = pts.map((p, i) => ({ x: i * 30 + 20, y: 72 - (p / maxPts) * 58 }));
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
                        {/* Grid line */}
                        <line x1="18" y1="40" x2={chartW} y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="3" />
                        <path d={areaD} fill="url(#areaGradPub)" opacity="0.3" />
                        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="3" fill="#3b82f6" />
                            {i === points.length - 1 && <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">{pts[i]}</text>}
                          </g>
                        ))}
                        <defs><linearGradient id="areaGradPub" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="transparent" /></linearGradient></defs>
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}

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

            {/* Resultados de partidos */}
            <div className="td-section">
              <h4>Resultados ({teamResults.length})</h4>
              {loadingResults ? (
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Cargando resultados...</p>
              ) : teamResults.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sin partidos jugados aún.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {teamResults.map(r => (
                    <div key={r.partido_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', borderRadius: '8px', background: r.resultado === 'G' ? 'rgba(16,185,129,0.1)' : r.resultado === 'P' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${r.resultado === 'G' ? 'rgba(16,185,129,0.2)' : r.resultado === 'P' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'}` }}>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', minWidth: 22 }}>J{r.jornada_numero}</span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <img src={getFileUrl(r.equipo_local_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.equipo_local) + '&background=3b82f6&color=fff&size=18'} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e2e8f0' }}>{r.equipo_local}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', minWidth: 40, textAlign: 'center' }}>{r.puntos_local} - {r.puntos_visitante}</span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e2e8f0' }}>{r.equipo_visitante}</span>
                        <img src={getFileUrl(r.equipo_visitante_logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.equipo_visitante) + '&background=8b5cf6&color=fff&size=18'} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ranking */}
            <div className="td-section">
              <h4>Ranking del torneo</h4>
              <div className="td-ranking">
                {tabla_posiciones.map((row, i) => (
                  <div key={row.equipo_id} className={`td-ranking-row ${row.equipo_id === selectedTeam.id ? 'highlight' : ''}`}>
                    <span className="td-ranking-pos">{i + 1}</span>
                    <span className="td-ranking-name">{row.equipo_nombre}</span>
                    <span className="td-ranking-pts">{row.pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* View Photo Modal - Player Card */}
      <Modal open={!!viewPhoto} onClose={() => { setViewPhoto(null); setExpandedPhoto(false); }} title="" className="modal-dark modal-player-card">
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

      {/* Footer */}
      <div className="public-footer">
        <a href="/login">Tornealo Sports</a>
        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '0.5rem' }}>v{import.meta.env.VITE_APP_VERSION}</span>
      </div>
    </div>
  );
}
