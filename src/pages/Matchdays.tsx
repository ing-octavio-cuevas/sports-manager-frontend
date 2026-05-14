import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit, Trash2, Eye, Calendar, LayoutGrid, List } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import type { Matchday, Partido, PartidoSet, CombinacionPendiente, PartidoArbitraje } from '@/types';
import { api } from '@/services/api';

interface JornadaForm {
  numero: number;
  fecha: string;
  estatus: boolean;
}

interface PartidoForm {
  equipo_local_id: number;
  equipo_visitante_id: number;
  puntos_local: number;
  puntos_visitante: number;
  ubicacion_id: number;
  estatus: string;
  tipo: string;
  observaciones: string;
}

const emptyJornadaForm: JornadaForm = { numero: 1, fecha: '', estatus: false };
const emptyPartidoForm: PartidoForm = {
  equipo_local_id: 0, equipo_visitante_id: 0,
  puntos_local: 0, puntos_visitante: 0,
  ubicacion_id: 0, estatus: 'Por jugar', tipo: 'Oficial', observaciones: '',
};

export default function Matchdays() {
  const { tournaments } = useApp();
  const { usuario } = useAuth();
  const isHost = usuario?.roles?.includes('anfitrion') ?? false;

  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [jornadas, setJornadas] = useState<Matchday[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Jornada CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Matchday | null>(null);
  const [form, setForm] = useState<JornadaForm>(emptyJornadaForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Partidos
  const [viewJornada, setViewJornada] = useState<Matchday | null>(null);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loadingPartidos, setLoadingPartidos] = useState(false);
  const [partidoModalOpen, setPartidoModalOpen] = useState(false);
  const [editingPartido, setEditingPartido] = useState<Partido | null>(null);
  const [partidoForm, setPartidoForm] = useState<PartidoForm>(emptyPartidoForm);
  const [savingPartido, setSavingPartido] = useState(false);
  const [deletePartidoId, setDeletePartidoId] = useState<number | null>(null);
  const [viewPartido, setViewPartido] = useState<Partido | null>(null);
  const [viewPartidoSets, setViewPartidoSets] = useState<PartidoSet[]>([]);

  // Sets state
  const [sets, setSets] = useState<PartidoSet[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [localSets, setLocalSets] = useState<{ id: number; marcador_local: number; marcador_visitante: number }[]>([]);

  // Arbitrajes
  const [arbitrajes, setArbitrajes] = useState<PartidoArbitraje[]>([]);
  const [partidosArbitrajes, setPartidosArbitrajes] = useState<Record<number, PartidoArbitraje[]>>({});

  // Combinaciones pendientes
  const [combModalOpen, setCombModalOpen] = useState(false);
  const [vueltas, setVueltas] = useState(1);
  const [combinaciones, setCombinaciones] = useState<CombinacionPendiente[]>([]);
  const [loadingComb, setLoadingComb] = useState(false);

  const torneoId = selectedTournament ? Number(selectedTournament) : 0;
  const [localTeams, setLocalTeams] = useState<import('@/types').Team[]>([]);
  const [ubicaciones, setUbicaciones] = useState<import('@/types').Ubicacion[]>([]);
  const [viewUbicacion, setViewUbicacion] = useState<import('@/types').Ubicacion | null>(null);
  const tournamentTeams = localTeams.filter(t => t.torneo_id === torneoId);

  const fetchJornadas = useCallback(async () => {
    if (!torneoId) { setJornadas([]); setLocalTeams([]); setUbicaciones([]); return; }
    setLoading(true);
    try {
      const [jornadasData, equiposData, ubicacionesData] = await Promise.all([
        api.getJornadas(torneoId),
        api.getEquipos(),
        api.getUbicaciones(torneoId),
      ]);
      setJornadas(Array.isArray(jornadasData) ? jornadasData : []);
      setLocalTeams(Array.isArray(equiposData) ? equiposData : []);
      setUbicaciones(Array.isArray(ubicacionesData) ? ubicacionesData : []);
    } catch (err) {
      console.error(err);
      setJornadas([]);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => { fetchJornadas(); }, [fetchJornadas]);

  // Jornada CRUD
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyJornadaForm, numero: jornadas.length + 1 });
    setModalOpen(true);
  };

  const openEdit = (j: Matchday) => {
    setEditing(j);
    setForm({ numero: j.numero, fecha: j.fecha.split('T')[0], estatus: j.estatus });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!torneoId) return;
    setSaving(true);
    try {
      const fecha = form.fecha ? `${form.fecha}T00:00:00` : new Date().toISOString();
      if (editing) {
        await api.updateJornada(editing.id, { numero: form.numero, fecha, estatus: form.estatus });
      } else {
        await api.createJornada({ torneo_id: torneoId, numero: form.numero, fecha, estatus: form.estatus });
      }
      await fetchJornadas();
      setModalOpen(false);
      setToast({ message: editing ? 'Jornada actualizada' : 'Jornada creada', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al guardar jornada', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.deleteJornada(deleteId);
      await fetchJornadas();
      setToast({ message: 'Jornada eliminada', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al eliminar jornada', type: 'error' });
    }
    setDeleteId(null);
  };

  // Partidos
  const openPartidos = async (j: Matchday) => {
    setViewJornada(j);
    setLoadingPartidos(true);
    setPartidosArbitrajes({});
    try {
      const data = await api.getPartidos(j.torneo_id, j.id);
      const list = Array.isArray(data) ? data : [];
      setPartidos(list);
      // Cargar arbitrajes de cada partido
      const arbMap: Record<number, PartidoArbitraje[]> = {};
      await Promise.all(
        list.map(async (p: Partido) => {
          try {
            const arbs = await api.getArbitrajes(p.id);
            arbMap[p.id] = Array.isArray(arbs) ? arbs : [];
          } catch { arbMap[p.id] = []; }
        })
      );
      setPartidosArbitrajes(arbMap);
    } catch (err) {
      console.error(err);
      setPartidos([]);
    } finally {
      setLoadingPartidos(false);
    }
  };

  const refreshPartidos = async () => {
    if (!viewJornada) return;
    try {
      const data = await api.getPartidos(viewJornada.torneo_id, viewJornada.id);
      const list = Array.isArray(data) ? data : [];
      setPartidos(list);
      // Recargar arbitrajes
      const arbMap: Record<number, PartidoArbitraje[]> = {};
      await Promise.all(
        list.map(async (p: Partido) => {
          try {
            const arbs = await api.getArbitrajes(p.id);
            arbMap[p.id] = Array.isArray(arbs) ? arbs : [];
          } catch { arbMap[p.id] = []; }
        })
      );
      setPartidosArbitrajes(arbMap);
    } catch { setPartidos([]); }
  };

  const checkJornadaCompleta = async () => {
    if (!viewJornada) return;
    try {
      const data = await api.getPartidos(viewJornada.torneo_id, viewJornada.id);
      const list = Array.isArray(data) ? data : [];
      const todosJugados = list.length > 0 && list.every((p: Partido) => p.estatus === 'Jugado');
      const nuevoEstatus = todosJugados;
      if (nuevoEstatus !== viewJornada.estatus) {
        await api.updateJornada(viewJornada.id, { numero: viewJornada.numero, fecha: viewJornada.fecha, estatus: nuevoEstatus });
        await fetchJornadas();
      }
    } catch { /* silencioso */ }
  };

  const openEditPartido = async (p: Partido) => {
    setEditingPartido(p);
    setPartidoForm({
      equipo_local_id: p.equipo_local_id,
      equipo_visitante_id: p.equipo_visitante_id,
      puntos_local: p.puntos_local || 0,
      puntos_visitante: p.puntos_visitante || 0,
      ubicacion_id: p.ubicacion_id || 0,
      estatus: p.estatus || 'Por jugar',
      tipo: p.tipo || 'Oficial',
      observaciones: p.observaciones || '',
    });
    setPartidoModalOpen(true);
    // Cargar sets
    setLoadingSets(true);
    try {
      const [setsData, arbitrajesData] = await Promise.all([
        api.getSets(p.id),
        api.getArbitrajes(p.id),
      ]);
      const list = Array.isArray(setsData) ? setsData : [];
      setSets(list);
      setLocalSets(list.map(s => ({ id: s.id, marcador_local: s.marcador_local, marcador_visitante: s.marcador_visitante })));
      setArbitrajes(Array.isArray(arbitrajesData) ? arbitrajesData : []);
    } catch {
      setSets([]);
      setLocalSets([]);
      setArbitrajes([]);
    } finally {
      setLoadingSets(false);
    }
  };

  const openCreatePartido = () => {
    setEditingPartido(null);
    setPartidoForm(emptyPartidoForm);
    setSets([]);
    setLocalSets([]);
    setPartidoModalOpen(true);
  };

  const handleSavePartido = async () => {
    if (!viewJornada || !partidoForm.equipo_local_id || !partidoForm.equipo_visitante_id) return;
    setSavingPartido(true);
    try {
      const payload = {
        jornada_id: viewJornada.id,
        equipo_local_id: partidoForm.equipo_local_id,
        equipo_visitante_id: partidoForm.equipo_visitante_id,
        puntos_local: partidoForm.puntos_local,
        puntos_visitante: partidoForm.puntos_visitante,
        ubicacion_id: partidoForm.ubicacion_id || null,
        estatus: partidoForm.estatus || 'Por jugar',
        tipo: partidoForm.tipo || 'Oficial',
        observaciones: partidoForm.observaciones || null,
      };
      if (editingPartido) {
        await api.updatePartido(editingPartido.id, payload);
        // Guardar sets editados
        if (localSets.length > 0) {
          await Promise.all(
            localSets.map(ls => api.updateSet(editingPartido.id, ls.id, { marcador_local: ls.marcador_local, marcador_visitante: ls.marcador_visitante }))
          );
        }
      } else {
        await api.createPartido({ torneo_id: viewJornada.torneo_id, ...payload });
      }
      await refreshPartidos();
      setPartidoModalOpen(false);
      setToast({ message: editingPartido ? 'Partido actualizado' : 'Partido creado', type: 'success' });
      await checkJornadaCompleta();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al guardar partido', type: 'error' });
    } finally {
      setSavingPartido(false);
    }
  };

  const handleDeletePartido = async () => {
    if (deletePartidoId === null) return;
    try {
      await api.deletePartido(deletePartidoId);
      await refreshPartidos();
      setToast({ message: 'Partido eliminado', type: 'success' });
      await checkJornadaCompleta();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al eliminar partido', type: 'error' });
    }
    setDeletePartidoId(null);
  };

  // Sets
  const handleAddSet = async () => {
    if (!editingPartido) return;
    // Primero guardar los sets editados localmente
    if (localSets.length > 0) {
      await Promise.all(
        localSets.map(ls => api.updateSet(editingPartido.id, ls.id, { marcador_local: ls.marcador_local, marcador_visitante: ls.marcador_visitante }))
      );
    }
    const nextNum = sets.length > 0 ? Math.max(...sets.map(s => s.numero_set)) + 1 : 1;
    try {
      await api.createSet(editingPartido.id, { numero_set: nextNum, marcador_local: 0, marcador_visitante: 0 });
      const data = await api.getSets(editingPartido.id);
      const list = Array.isArray(data) ? data : [];
      setSets(list);
      setLocalSets(list.map(s => ({ id: s.id, marcador_local: s.marcador_local, marcador_visitante: s.marcador_visitante })));
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al agregar set', type: 'error' });
    }
  };

  const handleDeleteSet = async (setId: number) => {
    if (!editingPartido) return;
    try {
      await api.deleteSet(editingPartido.id, setId);
      const data = await api.getSets(editingPartido.id);
      const list = Array.isArray(data) ? data : [];
      setSets(list);
      setLocalSets(list.map(s => ({ id: s.id, marcador_local: s.marcador_local, marcador_visitante: s.marcador_visitante })));
      setToast({ message: 'Set eliminado', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al eliminar set', type: 'error' });
    }
  };

  const updateLocalSet = (setId: number, field: 'marcador_local' | 'marcador_visitante', value: number) => {
    setLocalSets(prev => prev.map(s => s.id === setId ? { ...s, [field]: value } : s));
  };

  const handleUpdateArbitraje = async (arb: PartidoArbitraje, updates: Partial<PartidoArbitraje>) => {
    try {
      const updated = { ...arb, ...updates };
      await api.updateArbitraje(arb.id, {
        partido_id: updated.partido_id,
        equipo_id: updated.equipo_id,
        pagado: updated.pagado,
        monto: updated.monto,
        fecha_pago: updated.fecha_pago,
        observaciones: updated.observaciones,
      });
      setArbitrajes(prev => prev.map(a => a.id === arb.id ? { ...a, ...updates } : a));
      setToast({ message: 'Arbitraje actualizado', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al actualizar arbitraje', type: 'error' });
    }
  };

  // Combinaciones pendientes
  const [selectedComb, setSelectedComb] = useState<Set<number>>(new Set());

  const openCombinaciones = async () => {
    setCombinaciones([]);
    setSelectedComb(new Set());
    setCombModalOpen(true);
    // Cargar automáticamente usando numero_vueltas del torneo
    const torneo = tournaments.find(t => t.id === torneoId);
    const numVueltas = torneo?.numero_vueltas || 1;
    setVueltas(numVueltas);
    setLoadingComb(true);
    try {
      const data = await api.getCombinacionesPendientes(torneoId, numVueltas);
      const list = Array.isArray(data) ? data : [];
      setCombinaciones(list);
      setSelectedComb(new Set());
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al obtener combinaciones', type: 'error' });
    } finally {
      setLoadingComb(false);
    }
  };

  const toggleCombSelection = (index: number) => {
    setSelectedComb(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAllComb = () => {
    if (selectedComb.size === combinaciones.length) {
      setSelectedComb(new Set());
    } else {
      setSelectedComb(new Set(combinaciones.map((_, i) => i)));
    }
  };

  const crearPartidosDesdeCombinaciones = async (jornadaId: number) => {
    if (!torneoId || selectedComb.size === 0) return;
    const selected = combinaciones.filter((_, i) => selectedComb.has(i));
    try {
      await Promise.all(
        selected.map(c =>
          api.createPartido({
            torneo_id: torneoId,
            jornada_id: jornadaId,
            equipo_local_id: c.equipo_local_id,
            equipo_visitante_id: c.equipo_visitante_id,
            puntos_local: 0, puntos_visitante: 0,
            ubicacion_id: null, estatus: 'Por jugar', tipo: 'Oficial', observaciones: null,
          })
        )
      );
      setCombModalOpen(false);
      setToast({ message: `${selected.length} partidos creados correctamente`, type: 'success' });
      if (viewJornada && viewJornada.id === jornadaId) await refreshPartidos();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al crear partidos', type: 'error' });
    }
  };

  const getTeamName = (id: number) => localTeams.find(t => t.id === id)?.nombre || `Equipo ${id}`;
  const getUbicacionName = (id: number | null) => id ? ubicaciones.find(u => u.id === id)?.nombre || '—' : '—';

  const getArbitrajePagado = (partidoId: number, equipoId: number) => {
    const arbs = partidosArbitrajes[partidoId] || [];
    const arb = arbs.find(a => a.equipo_id === equipoId);
    return arb?.pagado || false;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Jornadas</h2>
        {isHost && torneoId > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={openCombinaciones}>Asignar pendientes</button>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nueva Jornada</button>
          </div>
        )}
      </div>

      {/* Filter + View Toggle */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}>
          <option value="">Seleccionar torneo...</option>
          {[...tournaments].sort((a, b) => a.id - b.id).map(t => <option key={t.id} value={String(t.id)}>{t.nombre}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('cards')} title="Vista tarjetas">
            <LayoutGrid size={16} />
          </button>
          <button className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setViewMode('table')} title="Vista tabla">
            <List size={16} />
          </button>
        </div>
      </div>

      {!selectedTournament ? (
        <div className="empty-state"><Calendar size={48} /><p>Selecciona un torneo para ver las jornadas</p></div>
      ) : loading ? (
        <div className="empty-state"><p>Cargando jornadas...</p></div>
      ) : jornadas.length === 0 ? (
        <div className="empty-state"><Calendar size={48} /><p>No hay jornadas registradas</p></div>
      ) : viewMode === 'cards' ? (
        <div className="card-grid">
          {[...jornadas].sort((a, b) => a.numero - b.numero).map(j => (
            <div key={j.id} className="card">
              <h3 className="card-title">Jornada {j.numero}</h3>
              <div className="card-details">
                <p><strong>Fecha:</strong> {j.fecha ? new Date(j.fecha).toLocaleDateString() : '—'}</p>
                <p><strong>Estatus:</strong> <span className={`badge badge-${j.estatus ? 'active' : 'warning'}`}>{j.estatus ? 'Terminada' : 'Por Jugar'}</span></p>
              </div>
              <div className="card-actions">
                <button className="btn btn-sm btn-ghost" onClick={() => openPartidos(j)}><Eye size={16} /> Partidos</button>
                {isHost && (
                  <>
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(j)}><Edit size={16} /></button>
                    <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteId(j.id)}><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Estatus</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[...jornadas].sort((a, b) => a.numero - b.numero).map(j => (
                <tr key={j.id}>
                  <td><strong>Jornada {j.numero}</strong></td>
                  <td>{j.fecha ? new Date(j.fecha).toLocaleDateString() : '—'}</td>
                  <td><span className={`badge badge-${j.estatus ? 'active' : 'warning'}`}>{j.estatus ? 'Terminada' : 'Por Jugar'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => openPartidos(j)} title="Partidos"><Eye size={16} /></button>
                      {isHost && (
                        <>
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(j)} title="Editar"><Edit size={16} /></button>
                          <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteId(j.id)} title="Eliminar"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Jornada Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Jornada' : 'Nueva Jornada'}>
        <div className="form-stack">
          <div className="form-group">
            <label>Número de jornada *</label>
            <input type="number" min={1} value={form.numero} onChange={e => setForm({ ...form, numero: Number(e.target.value) })} />
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear jornada'}
          </button>
        </div>
      </Modal>

      {/* Partidos Modal */}
      <Modal open={!!viewJornada} onClose={() => setViewJornada(null)} title={`Jornada ${viewJornada?.numero || ''} — Partidos`} extraWide>
        {loadingPartidos ? (
          <p>Cargando partidos...</p>
        ) : (
          <div>
            {isHost && (
              <div style={{ marginBottom: '1rem' }}>
                <button className="btn btn-primary btn-sm" onClick={openCreatePartido}><Plus size={16} /> Agregar Partido</button>
              </div>
            )}
            {partidos.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No hay partidos en esta jornada.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Local</th>
                      <th>Pts</th>
                      <th></th>
                      <th>Pts</th>
                      <th>Visitante</th>
                      <th>Tipo</th>
                      <th>Ubicación</th>
                      <th>Estatus</th>
                      <th title="Arbitraje pagado">💰</th>
                      <th>Observaciones</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...partidos].sort((a, b) => getTeamName(a.equipo_local_id).localeCompare(getTeamName(b.equipo_local_id))).map(p => (
                      <tr key={p.id} style={{ background: p.estatus === 'Jugado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }}>
                        <td><strong>{getTeamName(p.equipo_local_id)}</strong></td>
                        <td className="text-center" style={{ fontWeight: 700, color: 'var(--accent)' }}>{p.puntos_local}</td>
                        <td className="text-center" style={{ color: 'var(--text-secondary)' }}>|</td>
                        <td className="text-center" style={{ fontWeight: 700, color: '#8b5cf6' }}>{p.puntos_visitante}</td>
                        <td><strong>{getTeamName(p.equipo_visitante_id)}</strong></td>
                        <td>{p.tipo || '—'}</td>
                        <td>{p.ubicacion_id ? <button className="btn btn-sm btn-ghost" style={{ padding: 0, textDecoration: 'underline' }} onClick={() => { const u = ubicaciones.find(ub => ub.id === p.ubicacion_id); if (u) setViewUbicacion(u); }}>{getUbicacionName(p.ubicacion_id)}</button> : '—'}</td>
                        <td>{p.estatus || '—'}</td>
                        <td className="text-center">
                          {getArbitrajePagado(p.id, p.equipo_local_id) && getArbitrajePagado(p.id, p.equipo_visitante_id)
                            ? <span style={{ color: 'var(--success)' }}>✓✓</span>
                            : getArbitrajePagado(p.id, p.equipo_local_id) || getArbitrajePagado(p.id, p.equipo_visitante_id)
                              ? <span style={{ color: 'var(--warning)' }}>✓</span>
                              : <span style={{ color: 'var(--text-secondary)' }}>—</span>
                          }
                        </td>
                        <td>{p.observaciones ? (p.observaciones.length > 10 ? p.observaciones.slice(0, 10) + '...' : p.observaciones) : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-sm btn-ghost" onClick={async () => { setViewPartido(p); try { const d = await api.getSets(p.id); setViewPartidoSets(Array.isArray(d) ? d : []); } catch { setViewPartidoSets([]); } }} title="Ver"><Eye size={14} /></button>
                            {isHost && (
                              <>
                                <button className="btn btn-sm btn-ghost" onClick={() => openEditPartido(p)} title="Editar"><Edit size={14} /></button>
                                <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeletePartidoId(p.id)} title="Eliminar"><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Partido Modal */}
      <Modal open={partidoModalOpen} onClose={() => setPartidoModalOpen(false)} title={editingPartido ? 'Editar Partido' : 'Nuevo Partido'} wide>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Columna Local */}
          <div style={{ borderRight: '1px solid var(--border)', paddingRight: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Local</h4>
            <div className="form-stack">
              <div className="form-group">
                <label>Equipo *</label>
                {editingPartido ? (
                  <input value={getTeamName(partidoForm.equipo_local_id)} disabled style={{ background: 'var(--bg)' }} />
                ) : (
                  <select value={partidoForm.equipo_local_id} onChange={e => setPartidoForm({ ...partidoForm, equipo_local_id: Number(e.target.value) })}>
                    <option value={0}>Seleccionar...</option>
                    {tournamentTeams.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Columna Visitante */}
          <div>
            <h4 style={{ marginBottom: '1rem', color: '#8b5cf6' }}>Visitante</h4>
            <div className="form-stack">
              <div className="form-group">
                <label>Equipo *</label>
                {editingPartido ? (
                  <input value={getTeamName(partidoForm.equipo_visitante_id)} disabled style={{ background: 'var(--bg)' }} />
                ) : (
                  <select value={partidoForm.equipo_visitante_id} onChange={e => setPartidoForm({ ...partidoForm, equipo_visitante_id: Number(e.target.value) })}>
                    <option value={0}>Seleccionar...</option>
                    {tournamentTeams.filter(t => t.id !== partidoForm.equipo_local_id).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Campos generales */}
        <div className="form-grid" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div className="form-group">
            <label>Ubicación</label>
            <select value={partidoForm.ubicacion_id} onChange={e => setPartidoForm({ ...partidoForm, ubicacion_id: Number(e.target.value) })}>
              <option value={0}>Sin asignar</option>
              {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.direccion ? ` — ${u.direccion}` : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Estatus</label>
            <select value={partidoForm.estatus} onChange={e => setPartidoForm({ ...partidoForm, estatus: e.target.value })}>
              <option value="Por jugar">Por jugar</option>
              <option value="Jugado">Jugado</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select value={partidoForm.tipo} onChange={e => setPartidoForm({ ...partidoForm, tipo: e.target.value })}>
              <option value="Oficial">Oficial</option>
              <option value="Amistoso">Amistoso</option>
            </select>
          </div>
          <div className="form-group">
            <label>Observaciones</label>
            <input value={partidoForm.observaciones} onChange={e => setPartidoForm({ ...partidoForm, observaciones: e.target.value })} placeholder="Opcional" />
          </div>
        </div>

        {/* Sets section - solo en edición */}
        {editingPartido && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4>Marcador del Partido</h4>
              <button className="btn btn-sm btn-secondary" onClick={() => {
                // Mejor de 3: si 2 sets → ganador lleva 3 pts; si 3 sets → cada set ganado vale 1 pt
                const setsLocal = localSets.filter(s => s.marcador_local > s.marcador_visitante).length;
                const setsVisitante = localSets.filter(s => s.marcador_visitante > s.marcador_local).length;
                const totalSets = localSets.length;
                let ptsLocal = 0;
                let ptsVisitante = 0;
                if (totalSets === 2) {
                  if (setsLocal === 2) ptsLocal = 3;
                  else if (setsVisitante === 2) ptsVisitante = 3;
                } else if (totalSets >= 3) {
                  ptsLocal = setsLocal;
                  ptsVisitante = setsVisitante;
                }
                setPartidoForm(prev => ({ ...prev, puntos_local: ptsLocal, puntos_visitante: ptsVisitante }));
              }}>Mejor de 3</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div className="form-group">
                <label style={{ color: 'var(--accent)', fontWeight: 700 }}>{getTeamName(editingPartido.equipo_local_id)} — Puntos</label>
                <input type="text" inputMode="numeric" value={partidoForm.puntos_local !== null ? partidoForm.puntos_local : ''} onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) setPartidoForm({ ...partidoForm, puntos_local: e.target.value === '' ? 0 : Number(e.target.value) }); }} />
              </div>
              <div className="form-group">
                <label style={{ color: '#8b5cf6', fontWeight: 700 }}>{getTeamName(editingPartido.equipo_visitante_id)} — Puntos</label>
                <input type="text" inputMode="numeric" value={partidoForm.puntos_visitante !== null ? partidoForm.puntos_visitante : ''} onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) setPartidoForm({ ...partidoForm, puntos_visitante: e.target.value === '' ? 0 : Number(e.target.value) }); }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4>Sets</h4>
              <button className="btn btn-sm btn-primary" onClick={handleAddSet}><Plus size={14} /> Agregar Set</button>
            </div>
            {loadingSets ? (
              <p style={{ color: 'var(--text-secondary)' }}>Cargando sets...</p>
            ) : localSets.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No hay sets registrados.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>{getTeamName(editingPartido.equipo_local_id)}</th>
                      <th>{getTeamName(editingPartido.equipo_visitante_id)}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...localSets].sort((a, b) => {
                      const sa = sets.find(s => s.id === a.id);
                      const sb = sets.find(s => s.id === b.id);
                      return (sa?.numero_set || 0) - (sb?.numero_set || 0);
                    }).map(ls => {
                      const setData = sets.find(s => s.id === ls.id);
                      return (
                        <tr key={ls.id}>
                          <td><strong>Set {setData?.numero_set || '?'}</strong></td>
                          <td>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={ls.marcador_local !== null ? ls.marcador_local : ''}
                              onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) updateLocalSet(ls.id, 'marcador_local', e.target.value === '' ? 0 : Number(e.target.value)); }}
                              style={{ width: 60, textAlign: 'center', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={ls.marcador_visitante !== null ? ls.marcador_visitante : ''}
                              onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) updateLocalSet(ls.id, 'marcador_visitante', e.target.value === '' ? 0 : Number(e.target.value)); }}
                              style={{ width: 60, textAlign: 'center', padding: '0.4rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                            />
                          </td>
                          <td>
                            <button className="btn btn-sm btn-ghost text-danger" onClick={() => handleDeleteSet(ls.id)} title="Eliminar"><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Arbitrajes section - solo en edición */}
        {editingPartido && arbitrajes.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>Arbitrajes</h4>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Equipo</th>
                    <th>Pagado</th>
                    <th>Monto</th>
                    <th>Fecha pago</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {arbitrajes.map(arb => (
                    <tr key={arb.id}>
                      <td><strong>{getTeamName(arb.equipo_id)}</strong></td>
                      <td>
                        <input type="checkbox" checked={arb.pagado} onChange={e => handleUpdateArbitraje(arb, { pagado: e.target.checked })} />
                      </td>
                      <td>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={arb.monto !== null ? arb.monto : ''}
                          onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) handleUpdateArbitraje(arb, { monto: e.target.value === '' ? null : Number(e.target.value) }); }}
                          style={{ width: 80, padding: '0.3rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                          placeholder="$"
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={arb.fecha_pago?.split('T')[0] || ''}
                          onChange={e => handleUpdateArbitraje(arb, { fecha_pago: e.target.value ? `${e.target.value}T00:00:00` : null })}
                          style={{ padding: '0.3rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={arb.observaciones || ''}
                          onChange={e => handleUpdateArbitraje(arb, { observaciones: e.target.value || null })}
                          style={{ width: 120, padding: '0.3rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                          placeholder="Notas"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setPartidoModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSavePartido} disabled={savingPartido}>
            {savingPartido ? 'Guardando...' : editingPartido ? 'Guardar cambios' : 'Crear partido'}
          </button>
        </div>
      </Modal>

      {/* Combinaciones Pendientes Modal */}
      <Modal open={combModalOpen} onClose={() => setCombModalOpen(false)} title="Asignar partidos" extraWide>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Vueltas configuradas: <strong>{vueltas}</strong>
        </p>

        {loadingComb ? (
          <p>Cargando...</p>
        ) : combinaciones.length > 0 ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>
                {selectedComb.size} de {combinaciones.length} partidos seleccionados:
              </p>
              <button className="btn btn-sm btn-ghost" onClick={toggleAllComb}>
                {selectedComb.size === combinaciones.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div className="table-wrapper" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" checked={selectedComb.size === combinaciones.length} onChange={toggleAllComb} />
                    </th>
                    <th>Local</th>
                    <th>vs</th>
                    <th>Visitante</th>
                  </tr>
                </thead>
                <tbody>
                  {combinaciones.map((c, i) => (
                    <tr key={i} style={{ opacity: selectedComb.has(i) ? 1 : 0.5 }}>
                      <td>
                        <input type="checkbox" checked={selectedComb.has(i)} onChange={() => toggleCombSelection(i)} />
                      </td>
                      <td><strong>{c.equipo_local_nombre}</strong></td>
                      <td className="text-center">vs</td>
                      <td><strong>{c.equipo_visitante_nombre}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Asignar seleccionados a jornada:</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {jornadas.filter(j => !j.estatus).map(j => (
                  <button key={j.id} className="btn btn-sm btn-secondary" onClick={() => crearPartidosDesdeCombinaciones(j.id)} disabled={selectedComb.size === 0}>
                    Jornada {j.numero}
                  </button>
                ))}
              </div>
              {jornadas.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Crea una jornada primero.</p>}
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>No hay partidos pendientes por generar. Todos los partidos ya fueron creados.</p>
        )}
      </Modal>

      {/* View Partido Modal */}
      <Modal open={!!viewPartido} onClose={() => setViewPartido(null)} title="Detalle del Partido" wide>
        {viewPartido && (
          <div>
            {/* Equipos header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Local</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{getTeamName(viewPartido.equipo_local_id)}</p>
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-secondary)' }}>vs</span>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Visitante</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8b5cf6' }}>{getTeamName(viewPartido.equipo_visitante_id)}</p>
              </div>
            </div>

            {/* Puntos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', textAlign: 'center', background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)' }}>{viewPartido.puntos_local}</p>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Puntos</span>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>{viewPartido.puntos_visitante}</p>
            </div>

            {/* Info general */}
            <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
              <p><strong>Tipo:</strong> {viewPartido.tipo || '—'}</p>
              <p><strong>Estatus:</strong> <span className={`badge badge-${viewPartido.estatus === 'Jugado' ? 'active' : 'warning'}`}>{viewPartido.estatus || '—'}</span></p>
              <p><strong>Ubicación:</strong> {getUbicacionName(viewPartido.ubicacion_id)}</p>
              <p><strong>Observaciones:</strong> {viewPartido.observaciones || '—'}</p>
            </div>

            {/* Sets */}
            {viewPartidoSets.length > 0 && (
              <div>
                <h4 style={{ marginBottom: '0.75rem' }}>Sets</h4>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Set</th>
                        <th className="text-center">{getTeamName(viewPartido.equipo_local_id)}</th>
                        <th className="text-center">{getTeamName(viewPartido.equipo_visitante_id)}</th>
                        <th className="text-center">Ganador</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...viewPartidoSets].sort((a, b) => a.numero_set - b.numero_set).map(s => (
                        <tr key={s.id}>
                          <td><strong>Set {s.numero_set}</strong></td>
                          <td className="text-center" style={{ fontWeight: s.marcador_local > s.marcador_visitante ? 700 : 400, color: s.marcador_local > s.marcador_visitante ? 'var(--accent)' : undefined }}>{s.marcador_local}</td>
                          <td className="text-center" style={{ fontWeight: s.marcador_visitante > s.marcador_local ? 700 : 400, color: s.marcador_visitante > s.marcador_local ? '#8b5cf6' : undefined }}>{s.marcador_visitante}</td>
                          <td className="text-center">
                            {s.marcador_local > s.marcador_visitante ? getTeamName(viewPartido.equipo_local_id) : s.marcador_visitante > s.marcador_local ? getTeamName(viewPartido.equipo_visitante_id) : 'Empate'}
                          </td>
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

      {/* View Ubicacion Modal */}
      <Modal open={!!viewUbicacion} onClose={() => setViewUbicacion(null)} title={viewUbicacion?.nombre || 'Ubicación'}>
        {viewUbicacion && (
          <div>
            <div className="detail-grid" style={{ marginBottom: '1rem' }}>
              <p><strong>Nombre:</strong> {viewUbicacion.nombre}</p>
              <p><strong>Dirección:</strong> {viewUbicacion.direccion || '—'}</p>
            </div>
            {viewUbicacion.ubicacion && (
              <div>
                <a href={viewUbicacion.ubicacion} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary" style={{ marginBottom: '1rem' }}>
                  Ver en Google Maps
                </a>
                <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(viewUbicacion.nombre + (viewUbicacion.direccion ? ' ' + viewUbicacion.direccion : ''))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    width="100%"
                    height="250"
                    style={{ border: 0, display: 'block' }}
                    allowFullScreen
                    loading="lazy"
                    title={`Mapa - ${viewUbicacion.nombre}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} message="¿Eliminar esta jornada?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <ConfirmDialog open={!!deletePartidoId} message="¿Eliminar este partido?" onConfirm={handleDeletePartido} onCancel={() => setDeletePartidoId(null)} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
