import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import { api, getFileUrl } from '@/services/api';
import { formatDate } from '@/utils/dateUtils';
import Modal from '@/components/ui/Modal';
import type { Player } from '@/types';

interface PosicionRow {
  equipo_id: number;
  equipo_nombre: string;
  pj: number;
  pg: number;
  pp: number;
  sg: number;
  sp: number;
  pts: number;
  inscripcion_pagada: boolean;
  monto_pagado: number | null;
  adeudos: Adeudo[];
}

interface Adeudo {
  partido_id: number;
  rival: string;
  monto: number | null;
  fecha_partido: string;
}

export default function Standings() {
  const { tournaments } = useApp();
  const [selectedTournament, setSelectedTournament] = useState('');
  const [standings, setStandings] = useState<PosicionRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Detalle equipo
  const [viewTeam, setViewTeam] = useState<PosicionRow | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const fetchStandings = useCallback(async () => {
    if (!selectedTournament) { setStandings([]); return; }
    setLoading(true);
    try {
      const torneoId = Number(selectedTournament);
      const posData = await api.getTablaPosiciones(torneoId);
      setStandings(Array.isArray(posData) ? posData : []);
    } catch (err) {
      console.error(err);
      setStandings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTournament]);

  useEffect(() => { fetchStandings(); }, [fetchStandings]);

  const openTeamDetail = async (row: PosicionRow) => {
    setLoadingTeam(true);
    setViewTeam(row);
    setTeamPlayers([]);
    try {
      const players = await api.getJugadores(row.equipo_id);
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
                  <td className="team-cell"><button className="btn btn-sm btn-ghost" style={{ padding: 0, fontWeight: 700, color: 'var(--text)' }} onClick={() => openTeamDetail(row)}>{row.equipo_nombre}</button></td>
                  <td>{row.pj}</td>
                  <td>{row.pg}</td>
                  <td>{row.pp}</td>
                  <td>{row.sg}</td>
                  <td>{row.sp}</td>
                  <td className="points-cell"><strong>{row.pts}</strong></td>
                  <td className="text-center">
                    {row.adeudos.length > 0 ? (
                      <span title={`${row.adeudos.length} adeudo(s)`} style={{ color: 'var(--danger)' }}>
                        <AlertTriangle size={16} />
                      </span>
                    ) : (
                      <span style={{ color: 'var(--success)' }}>✓</span>
                    )}
                  </td>
                  <td className="text-center">
                    {(() => {
                      return row.inscripcion_pagada
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
      <Modal open={!!viewTeam || loadingTeam} onClose={() => { setViewTeam(null); setTeamPlayers([]); }} title={viewTeam?.equipo_nombre || 'Cargando...'} wide>
        {loadingTeam ? (
          <p>Cargando información del equipo...</p>
        ) : viewTeam && (
          <div>
            <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
              <p><strong>Inscripción:</strong> {viewTeam.inscripcion_pagada ? 'Pagada' : 'Pendiente'}</p>
              {viewTeam.monto_pagado !== null && <p><strong>Monto pagado:</strong> ${viewTeam.monto_pagado}</p>}
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
            {viewTeam.adeudos.length > 0 && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={18} /> Adeudos de arbitraje ({viewTeam.adeudos.length})
                </h4>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rival</th>
                        <th>Fecha</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewTeam.adeudos.map((a, i) => (
                        <tr key={i}>
                          <td>{a.rival}</td>
                          <td>{formatDate(a.fecha_partido)}</td>
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
