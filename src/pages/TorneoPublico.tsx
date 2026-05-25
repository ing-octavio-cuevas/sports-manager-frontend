import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Users, ClipboardList } from 'lucide-react';
import { getFileUrl } from '@/services/api';

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
      fecha: string;
      rival: string;
      jugadores_presentes: number;
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/torneos/${id}/resumen`);
        if (!res.ok) throw new Error('Torneo no encontrado');
        const json = await res.json();
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
        <div className="card-grid">
          {equipos.map(eq => (
            <div key={eq.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setSelectedEquipo(eq.id === selectedEquipo ? null : eq.id)}>
              <h3 className="card-title">{eq.nombre}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{eq.jugadores.length} jugadores</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle equipo seleccionado */}
      {selectedTeam && (
        <div style={{ marginTop: '1.5rem', background: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
          <h3 style={{ marginBottom: '1rem' }}>{selectedTeam.nombre}</h3>

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
                  <th>Capitán</th>
                </tr>
              </thead>
              <tbody>
                {selectedTeam.jugadores.map(j => (
                  <tr key={j.id}>
                    <td><img src={getFileUrl(j.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(j.nombre) + '&background=6366f1&color=fff&size=32'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} /></td>
                    <td><strong>{j.nombre}</strong></td>
                    <td>{j.numero}</td>
                    <td>{j.posicion || '—'}</td>
                    <td className="text-center">{j.es_capitan ? '⭐' : '—'}</td>
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
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Rival</th>
                    <th>Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.ultimas_asistencias.map(a => (
                    <tr key={a.partido_id}>
                      <td>{a.fecha}</td>
                      <td>{a.rival}</td>
                      <td>{a.jugadores_presentes}/{a.total_jugadores}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sports Manager</p>
    </div>
  );
}
