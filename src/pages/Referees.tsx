import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit, Trash2, Shield, DollarSign } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Referee } from '@/types';

export default function Referees() {
  const { referees, addReferee, updateReferee, deleteReferee, matches, teams, matchdays } = useApp();
  const { usuario } = useAuth();
  const isHost = usuario?.roles?.includes('anfitrion') ?? false;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Referee | null>(null);
  const [form, setForm] = useState({ fullName: '', status: 'active' as Referee['status'] });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewReferee, setViewReferee] = useState<Referee | null>(null);

  const openCreate = () => { setEditing(null); setForm({ fullName: '', status: 'active' }); setModalOpen(true); };
  const openEdit = (r: Referee) => { setEditing(r); setForm({ fullName: r.fullName, status: r.status }); setModalOpen(true); };
  const handleSave = () => {
    if (!form.fullName.trim()) return;
    if (editing) updateReferee(editing.id, form);
    else addReferee(form);
    setModalOpen(false);
  };

  const getRefereeMatches = (refId: string) => matches.filter(m => m.refereeId === refId);
  const getTeamName = (id: string) => teams.find(t => String(t.id) === id)?.nombre || '—';
  const getMatchdayName = (id: string) => matchdays.find(m => m.id === id)?.name || '—';

  return (
    <div className="page">
      <div className="page-header">
        <h2>Árbitros</h2>
        {isHost && <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nuevo Árbitro</button>}
      </div>

      {referees.length === 0 ? (
        <div className="empty-state"><Shield size={48} /><p>No hay árbitros registrados</p></div>
      ) : (
        <div className="card-grid">
          {referees.map(r => {
            const refMatches = getRefereeMatches(r.id);
            const paidCount = refMatches.filter(m => m.team1RefereePaid && m.team2RefereePaid).length;
            return (
              <div key={r.id} className="card">
                <h3 className="card-title">{r.fullName}</h3>
                <div className="card-details">
                  <p><span className={`badge badge-${r.status}`}>{r.status === 'active' ? 'Activo' : 'Inactivo'}</span></p>
                  <p><strong>Partidos asignados:</strong> {refMatches.length}</p>
                  <p><strong>Arbitrajes pagados:</strong> {paidCount} / {refMatches.length}</p>
                </div>
                <div className="card-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => setViewReferee(r)}><DollarSign size={16} /> Pagos</button>
                  {isHost && (
                    <>
                      <button className="btn btn-sm btn-ghost" onClick={() => openEdit(r)}><Edit size={16} /></button>
                      <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteId(r.id)}><Trash2 size={16} /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Referee Payments */}
      <Modal open={!!viewReferee} onClose={() => setViewReferee(null)} title={viewReferee ? `Pagos — ${viewReferee.fullName}` : ''} wide>
        {viewReferee && (() => {
          const refMatches = getRefereeMatches(viewReferee.id);
          return refMatches.length === 0 ? (
            <p className="text-muted">No tiene partidos asignados.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Jornada</th><th>Equipo 1</th><th>Equipo 2</th><th>Pago Eq.1</th><th>Pago Eq.2</th></tr>
                </thead>
                <tbody>
                  {refMatches.map(m => (
                    <tr key={m.id}>
                      <td>{getMatchdayName(m.matchdayId)}</td>
                      <td>{getTeamName(m.team1Id)}</td>
                      <td>{getTeamName(m.team2Id)}</td>
                      <td><span className={`badge ${m.team1RefereePaid ? 'badge-active' : 'badge-inactive'}`}>{m.team1RefereePaid ? 'Pagado' : 'Pendiente'}</span></td>
                      <td><span className={`badge ${m.team2RefereePaid ? 'badge-active' : 'badge-inactive'}`}>{m.team2RefereePaid ? 'Pagado' : 'Pendiente'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Árbitro' : 'Nuevo Árbitro'}>
        <div className="form-stack">
          <div className="form-group">
            <label>Nombre completo *</label>
            <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Estatus</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Referee['status'] })}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Guardar' : 'Crear'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} message="¿Eliminar este árbitro?" onConfirm={() => { if (deleteId) deleteReferee(deleteId); setDeleteId(null); }} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
