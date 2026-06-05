import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Users, ClipboardList } from 'lucide-react';
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
      jugadores_presentes: { jugador_id: number; nombre: string; numero: number; foto: string | null }[];
      total_jugadores: number;
    }[];
  }[];
}

export default function TorneoPublico() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TorneoPublicoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    <div className="public-page">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {torneo.logo && <img src={torneo.logo} alt="" style={{ width: 64, height: 64, borderRadius: '12px', objectFit: 'cover', marginBottom: '0.75rem' }} />}
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' }}>{torneo.nombre}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {torneo.categoria}{torneo.periodo ? ` · ${torneo.periodo}` : ''}
        </p>
      </div>

      {/* Tabla de posiciones */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ClipboardList size={20} /> Tabla de Posiciones
        </h2>
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
              {tabla_posiciones.map((row, i) => (
                <tr key={row.equipo_id} className={i < 3 ? 'top-row' : ''}>
                  <td className="rank">{i + 1}</td>
                  <td className="team-cell"><strong>{row.equipo_nombre}</strong></td>
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

      {/* Equipos */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} /> Equipos ({equipos.length})
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {equipos.map(eq => (
            <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '50px', boxShadow: 'var(--shadow)', transition: 'var(--transition)' }}>
              <img
                src={getFileUrl(eq.logo) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(eq.nombre) + '&background=3b82f6&color=fff&size=32'}
                alt=""
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => eq.logo && setViewPhoto({ url: getFileUrl(eq.logo)!, nombre: eq.nombre })}
              />
              <span style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }} onClick={() => setSelectedEquipo(eq.id)}>{eq.nombre}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal detalle equipo */}
      <Modal open={!!selectedTeam} onClose={() => setSelectedEquipo(null)} title={selectedTeam?.nombre || ''} wide>
        {selectedTeam && (
          <div>
            {/* Jugadores */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Jugadores</h4>
            <div className="table-wrapper" style={{ marginBottom: '1.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Foto</th>
                    <th>Nombre</th>
                    <th>#</th>
                    <th>Posición</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.jugadores.map(j => (
                    <tr key={j.id}>
                      <td><img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=32'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=256', nombre: j.nombre })} /></td>
                      <td><strong>{j.nombre}</strong>{j.es_capitan && <span style={{ fontSize: '0.7rem', verticalAlign: 'super', marginLeft: '2px' }}>⭐</span>}</td>
                      <td>{j.numero}</td>
                      <td>{j.posicion || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Últimas asistencias */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Últimas Asistencias</h4>
            {selectedTeam.ultimas_asistencias.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin registros de asistencia.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedTeam.ultimas_asistencias.map(a => (
                  <div key={a.partido_id} style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>vs {a.rival}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>J{a.jornada_numero} · {formatDate(a.fecha)} {new Date(a.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {a.jugadores_presentes.map(j => (
                        <span key={j.jugador_id} style={{ background: 'var(--success-light)', color: '#065f46', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=10b981&color=fff&size=20'} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setViewPhoto({ url: getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=10b981&color=fff&size=256', nombre: j.nombre })} />
                          #{j.numero} {j.nombre}
                        </span>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      {a.jugadores_presentes.length}/{a.total_jugadores} presentes
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* View Photo Modal */}
      <Modal open={!!viewPhoto} onClose={() => setViewPhoto(null)} title={viewPhoto?.nombre || 'Foto'}>
        {viewPhoto && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
            <img src={viewPhoto.url} alt={viewPhoto.nombre} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain' }} />
          </div>
        )}
      </Modal>

      <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          Sports Manager
        </a>
      </p>
    </div>
  );
}
