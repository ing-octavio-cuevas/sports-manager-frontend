import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Users, ClipboardList, Calendar } from 'lucide-react';
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
    nombre: string;
    logo: string;
    jugadores: {
      id: number;
      nombre: string;
      numero: number;
      posicion: string;
      es_capitan: boolean;
      foto: string | null;
    }[];
    ultimas_asistencias: {
      partido_id: number;
      jornada_numero: number;
      fecha: string;
      rival: string;
      tipo: string | null;
      jugadores_presentes: { jugador_id: number; nombre: string; numero: number; foto: string | null; manual: boolean }[];
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
    };
  }[];
}

type Tab = 'posiciones' | 'equipos' | 'asistencias';

export default function TorneoPublico() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TorneoPublicoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('posiciones');
  const [selectedEquipo, setSelectedEquipo] = useState<number | null>(null);
  const [viewPhoto, setViewPhoto] = useState<{ url: string; nombre: string } | null>(null);

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
      </div>

      {/* Content */}
      <div className="public-content">
        {/* Tab: Posiciones */}
        {activeTab === 'posiciones' && (
          <div>
            <div className="public-section-header">
              <h2>Tabla de Posiciones</h2>
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
                          return <img src={getFileUrl(eq?.logo || '') || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(row.equipo_nombre) + '&background=6366f1&color=fff&size=24'} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => eq?.logo && setViewPhoto({ url: getFileUrl(eq.logo)!, nombre: row.equipo_nombre })} />;
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
                    onClick={(e) => { e.stopPropagation(); if (eq.logo) setViewPhoto({ url: getFileUrl(eq.logo)!, nombre: eq.nombre }); }}
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
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {a.jugadores_presentes.map(j => (
                            <span key={j.jugador_id} style={{ background: 'var(--success-light)', color: '#065f46', padding: '0.15rem 0.4rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=10b981&color=fff&size=16'} alt="" style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=10b981&color=fff&size=256', nombre: j.nombre })} />
                              #{j.numero} {j.nombre}{j.manual && <sup style={{ fontSize: '0.55rem', color: '#64748b', marginLeft: '2px' }}>M</sup>}
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
      </div>

      {/* Modal detalle equipo - Dashboard */}
      <Modal open={!!selectedTeam} onClose={() => setSelectedEquipo(null)} title="" extraWide className="modal-dark">
        {selectedTeam && (
          <div className="team-dashboard">
            {/* Header */}
            <div className="td-header">
              <img src={getFileUrl(selectedTeam.logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedTeam.nombre) + '&background=3b82f6&color=fff&size=56'} alt="" className="td-header-logo" onClick={() => selectedTeam.logo && setViewPhoto({ url: getFileUrl(selectedTeam.logo)!, nombre: selectedTeam.nombre })} />
              <div>
                <h2 className="td-header-name">{selectedTeam.nombre}</h2>
                <p className="td-header-meta">{torneo.categoria} · {torneo.periodo}</p>
              </div>
            </div>

            {/* KPIs */}
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
                      <div className="td-pos-bar"><div style={{ width: `${(count / selectedTeam.estadisticas.total_jugadores) * 100}%` }} /></div>
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
              <h4>Plantilla ({selectedTeam.jugadores.length})</h4>
              <div className="td-plantilla">
                {selectedTeam.jugadores.map(j => (
                  <div key={j.id} className="td-player" onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=256', nombre: j.nombre })}>
                    <div className="td-player-photo-wrap">
                      <img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=48'} alt="" className="td-player-photo" />
                      {j.numero && <span className="td-player-number">{j.numero}</span>}
                    </div>
                    <span className="td-player-name">{j.nombre.split(' ')[0]}</span>
                    <span className="td-player-pos">{j.posicion || '—'}</span>
                  </div>
                ))}
              </div>
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

      {/* View Photo Modal */}
      <Modal open={!!viewPhoto} onClose={() => setViewPhoto(null)} title={viewPhoto?.nombre || 'Foto'} className="modal-dark">
        {viewPhoto && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
            <img src={viewPhoto.url} alt={viewPhoto.nombre} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', objectFit: 'contain' }} />
          </div>
        )}
      </Modal>

      {/* Footer */}
      <div className="public-footer">
        <a href="/login">Tornealo Sports</a>
      </div>
    </div>
  );
}
