import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ClipboardList, Save } from 'lucide-react';

export default function Results() {
  const { role, tournaments, matchdays, matches, teams, setResults, addSetResult, updateSetResult, updateMatch } = useApp();
  const canEdit = role === 'anfitrion' || role === 'arbitro';

  const [selectedTournament, setSelectedTournament] = useState('');
  const [selectedMatchday, setSelectedMatchday] = useState('');

  const filteredMatchdays = selectedTournament ? matchdays.filter(m => m.tournamentId === selectedTournament) : matchdays;
  const filteredMatches = selectedMatchday ? matches.filter(m => m.matchdayId === selectedMatchday) : [];

  const getTeamName = (id: string) => teams.find(t => String(t.id) === id)?.nombre || '—';
  const getMatchSets = (matchId: string) => setResults.filter(s => s.matchId === matchId).sort((a, b) => a.setNumber - b.setNumber);

  const handleScoreChange = (matchId: string, setNumber: number, field: 'team1Score' | 'team2Score', value: number) => {
    const existing = setResults.find(s => s.matchId === matchId && s.setNumber === setNumber);
    if (existing) {
      updateSetResult(existing.id, { [field]: value });
    } else {
      addSetResult({
        matchId, setNumber,
        team1Score: field === 'team1Score' ? value : 0,
        team2Score: field === 'team2Score' ? value : 0,
      });
    }
  };

  const handlePaymentToggle = (matchId: string, field: 'team1RefereePaid' | 'team2RefereePaid', value: boolean) => {
    updateMatch(matchId, { [field]: value });
  };

  const markCompleted = (matchId: string) => {
    updateMatch(matchId, { status: 'completed' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Resultados y Pagos</h2>
      </div>

      <div className="filter-bar">
        <select value={selectedTournament} onChange={e => { setSelectedTournament(e.target.value); setSelectedMatchday(''); }}>
          <option value="">Seleccionar torneo...</option>
          {tournaments.map(t => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
        </select>
        <select value={selectedMatchday} onChange={e => setSelectedMatchday(e.target.value)} disabled={!selectedTournament}>
          <option value="">Seleccionar jornada...</option>
          {filteredMatchdays.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {!selectedMatchday ? (
        <div className="empty-state"><ClipboardList size={48} /><p>Selecciona un torneo y una jornada para ver los partidos</p></div>
      ) : filteredMatches.length === 0 ? (
        <div className="empty-state"><ClipboardList size={48} /><p>No hay partidos en esta jornada</p></div>
      ) : (
        <div className="results-list">
          {filteredMatches.map(match => {
            const sets = getMatchSets(match.id);
            const setsArray = Array.from({ length: match.setsToPlay }, (_, i) => {
              const existing = sets.find(s => s.setNumber === i + 1);
              return { setNumber: i + 1, team1Score: existing?.team1Score ?? 0, team2Score: existing?.team2Score ?? 0 };
            });
            const team1SetsWon = setsArray.filter(s => s.team1Score > s.team2Score).length;
            const team2SetsWon = setsArray.filter(s => s.team2Score > s.team1Score).length;

            return (
              <div key={match.id} className="result-card">
                <div className="result-header">
                  <div className="result-teams">
                    <span className="team-name">{getTeamName(match.team1Id)}</span>
                    <span className="vs-label">vs</span>
                    <span className="team-name">{getTeamName(match.team2Id)}</span>
                  </div>
                  <span className={`badge badge-${match.status === 'completed' ? 'active' : match.status === 'in_progress' ? 'warning' : 'inactive'}`}>
                    {match.status === 'completed' ? 'Finalizado' : match.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                  </span>
                </div>

                <div className="sets-grid">
                  <div className="sets-header">
                    <span></span>
                    {setsArray.map(s => <span key={s.setNumber} className="set-label">Set {s.setNumber}</span>)}
                    <span className="set-label total-label">Total</span>
                  </div>
                  <div className="sets-row">
                    <span className="team-label">{getTeamName(match.team1Id)}</span>
                    {setsArray.map(s => (
                      <input key={s.setNumber} type="number" min={0} className="score-input"
                        value={s.team1Score} disabled={!canEdit}
                        onChange={e => handleScoreChange(match.id, s.setNumber, 'team1Score', Number(e.target.value))} />
                    ))}
                    <span className="set-total">{team1SetsWon}</span>
                  </div>
                  <div className="sets-row">
                    <span className="team-label">{getTeamName(match.team2Id)}</span>
                    {setsArray.map(s => (
                      <input key={s.setNumber} type="number" min={0} className="score-input"
                        value={s.team2Score} disabled={!canEdit}
                        onChange={e => handleScoreChange(match.id, s.setNumber, 'team2Score', Number(e.target.value))} />
                    ))}
                    <span className="set-total">{team2SetsWon}</span>
                  </div>
                </div>

                <div className="result-footer">
                  <div className="payment-checks">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={match.team1RefereePaid} disabled={!canEdit}
                        onChange={e => handlePaymentToggle(match.id, 'team1RefereePaid', e.target.checked)} />
                      Arbitraje {getTeamName(match.team1Id)}
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={match.team2RefereePaid} disabled={!canEdit}
                        onChange={e => handlePaymentToggle(match.id, 'team2RefereePaid', e.target.checked)} />
                      Arbitraje {getTeamName(match.team2Id)}
                    </label>
                  </div>
                  {canEdit && match.status !== 'completed' && (
                    <button className="btn btn-primary btn-sm" onClick={() => markCompleted(match.id)}>
                      <Save size={14} /> Marcar como finalizado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
