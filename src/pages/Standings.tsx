import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import { api, getFileUrl } from '@/services/api';
import Modal from '@/components/ui/Modal';
import type { Team, Player, Matchday, Partido, PartidoArbitraje } from '@/types';

interface PosicionRow {
  equipo_id: number;
  equipo_nombre: string;
  pj: number;
  pg: number;
  pp: number;
  sg: number;
  sp: number;
  pts: number;
}

interface Adeudo {
  partido_id: number;
  jornada_numero: number;
  equipo_local: string;
  equipo_visitante: string;
  monto: number | null;
}

export default function Standings() {
  const { tournaments } = useApp();
  const [selectedTournament, setSelectedTournament] = useState('');
  const [standings, setStandings] = useState<PosicionRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Adeudos por equipo
  const [adeudos, setAdeudos] = useState<Record<number, Adeudo[]>>({});
  const [equiposTorneo, setEquiposTorneo] = useState<Team[]>([]);

  // Detalle equipo
  const [viewTeam, setViewTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [teamAdeudos, setTeamAdeudos] = useState<Adeudo[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const fetchStandings = useCallback(async () => {
    if (!selectedTournament) { setStandings([]); setAdeudos({}); return; }
    setLoading(true);
    try {
      const torneoId = Number(selectedTournament);
      const [posData, jornadasData] = await Promise.all([
        api.getTablaPosiciones(torneoId),
        api.getJornadas(torneoId),
      ]);
      setStandings(Array.isArray(posData) ? posData : []);

      // Obtener jornadas terminadas
      const jornadasTerminadas = (Array.isArray(jornadasData) ? jornadasData : []).filter((j: Matchday) => j.estatus === true);

      // Obtener partidos y arbitrajes de jornadas terminadas
      const adeudosMap: Record<number, Adeudo[]> = {};
      const equiposData = await api.getEquipos();
      const equipos = Array.isArray(equiposData) ? equiposData : [];
      setEquiposTorneo(equipos.filter((e: Team) => e.torneo_id === torneoId));

      for (const jornada of jornadasTerminadas) {
        const partidos = await api.getPartidos(torneoId, jornada.id);
        const partidosList: Partido[] = Array.isArray(partidos) ? partidos : [];

        for (const partido of partidosList) {
          const arbs = await api.getArbitrajes(partido.id);
          const arbsList: PartidoArbitraje[] = Array.isArray(arbs) ? arbs : [];

          for (const arb of arbsList) {
            if (!arb.pagado) {
              if (!adeudosMap[arb.equipo_id]) adeudosMap[arb.equipo_id] = [];
              const localName = equipos.find((e: Team) => e.id === partido.equipo_local_id)?.nombre || '?';
              const visitanteName = equipos.find((e: Team) => e.id === partido.equipo_visitante_id)?.nombre || '?';
              adeudosMap[arb.equipo_id].push({
                partido_id: partido.id,
                jornada_numero: jornada.numero,
                equipo_local: localName,
                equipo_visitante: visitanteName,
                monto: arb.monto,
              });
            }
          }
        }
      }
      setAdeudos(adeudosMap);
    } catch (err) {
      console.error(err);
      setStandings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTournament]);

  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  const openTeamDetail = async (equipoId: number) => {
    setLoadingTeam(true);
    setViewTeam(null);
    setTeamPlayers([]);
    setTeamAdeudos(adeudos[equipoId] || []);
    try {
      const [team, players] = await Promise.all([
        api.getEquipo(equipoId),
        api.getJugadores(equipoId),
      ]);
      setViewTeam(team);
      setTeamPlayers(Array.isArray(players) ? players : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTeam(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Tabla de Posiciones</h2>
      </div>

      <div className="filter-bar">
        <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}>
          <option value="">Seleccionar torneo...</option>
          {[...tournaments].sort((a, b) => a.id - b.id).map(t => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
        </select>
      </div>

      {!selectedTournament ? (
        <div className="empty-state"><ClipboardList size={48} /><p>Selecciona un torneo para ver la tabla</p></div>
      ) : loading ? (
        <div className="empty-state"><p>Cargando tabla...</p></div>
      ) : standings.length === 0 ? (
        <div className="empty-state"><ClipboardList size={48} /><p>No hay datos de posiciones</p></div>
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
                <th>Arb.</th>
                <th>Insc.</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => (
                <tr key={row.equipo_id} className={i < 3 ? 'top-row' : ''}>
                  <td className="rank">{i + 1}</td>
                  <td className="team-cell"><button className="btn btn-sm btn-ghost" style={{ padding: 0, fontWeight: 700, color: 'var(--text)' }} onClick={() => openTeamDetail(row.equipo_id)}>{row.equipo_nombre}</button></td>
                  <td>{row.pj}</td>
                  <td>{row.pg}</td>
                  <td>{row.pp}</td>
                  <td>{row.sg}</td>
                  <td>{row.sp}</td>
                  <td className="points-cell"><strong>{row.pts}</strong></td>
                  <td className="text-center">
                    {(adeudos[row.equipo_id]?.length || 0) > 0 ? (
                      <span title={`${adeudos[row.equipo_id].length} adeudo(s)`} style={{ color: 'var(--danger)' }}>
                        <AlertTriangle size={16} />
                      </span>
                    ) : (
                      <span style={{ color: 'var(--success)' }}>✓</span>
                    )}
                  </td>
                  <td className="text-center">
                    {(() => {
                      const equipo = equiposTorneo.find(e => e.id === row.equipo_id);
                      return equipo?.inscripcion_pagada
                        ? <span style={{ color: 'var(--success)' }}>✓</span>
                        : <span title="Inscripción pendiente" style={{ color: 'var(--danger)' }}><AlertTriangle size={16} /></span>;
                    })()}
                  </td>
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

      {/* Team Detail Modal */}
      <Modal open={!!viewTeam || loadingTeam} onClose={() => { setViewTeam(null); setTeamPlayers([]); }} title={viewTeam?.nombre || 'Cargando...'} wide>
        {loadingTeam ? (
          <p>Cargando información del equipo...</p>
        ) : viewTeam && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <img
                src={viewTeam.logo && viewTeam.logo !== 'Desconocido' ? viewTeam.logo : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(viewTeam.nombre) + '&background=6366f1&color=fff&size=64'}
                alt=""
                style={{ width: 64, height: 64, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
              />
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>{viewTeam.nombre}</h3>
                <span className={`badge badge-${viewTeam.estatus ? 'active' : 'inactive'}`}>{viewTeam.estatus ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>

            <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
              <p><strong>Inscripción:</strong> {viewTeam.inscripcion_pagada ? 'Pagada' : 'Pendiente'}</p>
              {viewTeam.monto_pagado !== null && <p><strong>Monto pagado:</strong> ${viewTeam.monto_pagado}</p>}
              <p><strong>Fecha de creación:</strong> {new Date(viewTeam.fecha_creacion).toLocaleDateString()}</p>
            </div>

            <h4 style={{ marginBottom: '0.75rem' }}>Jugadores ({teamPlayers.length})</h4>
            {teamPlayers.length === 0 ? (
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
                      <th>Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...teamPlayers].sort((a, b) => a.id - b.id).map(p => (
                      <tr key={p.id}>
                        <td>
                          <img
                            src={getFileUrl(p.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.nombre) + '&background=6366f1&color=fff&size=32'}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                          />
                        </td>
                        <td><strong>{p.nombre}</strong></td>
                        <td>{p.numero}</td>
                        <td>{p.posicion}</td>
                        <td><span className={`badge badge-${p.estatus ? 'active' : 'inactive'}`}>{p.estatus ? 'Activo' : 'Inactivo'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Adeudos */}
            {teamAdeudos.length > 0 && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} /> Adeudos de arbitraje ({teamAdeudos.length})
                </h4>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Jornada</th>
                        <th>Partido</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamAdeudos.map((a, i) => (
                        <tr key={i}>
                          <td>Jornada {a.jornada_numero}</td>
                          <td>{a.equipo_local} vs {a.equipo_visitante}</td>
                          <td>{a.monto !== null ? `$${a.monto}` : 'Sin definir'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
