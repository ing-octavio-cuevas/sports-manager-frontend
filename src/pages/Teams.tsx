import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit, Trash2, Eye, Users, LayoutGrid, List, Upload, UserPlus, QrCode } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import type { Team, Player } from '@/types';
import { api, getFileUrl } from '@/services/api';
import { QRCodeSVG } from 'qrcode.react';

interface TeamForm {
  torneo_id: number;
  nombre: string;
  logo: string;
  estatus: boolean;
  inscripcion_pagada: boolean;
  monto_pagado: number | null;
  fecha_pago_inscripcion: string | null;
}

interface PlayerForm {
  nombre: string;
  numero: number;
  posicion: string;
  estatus: boolean;
  es_capitan: boolean;
  curp: string;
  email: string;
}

const emptyForm: TeamForm = {
  torneo_id: 0,
  nombre: '',
  logo: '',
  estatus: true,
  inscripcion_pagada: false,
  monto_pagado: null,
  fecha_pago_inscripcion: null,
};

const emptyPlayerForm: PlayerForm = {
  nombre: '',
  numero: 0,
  posicion: '',
  estatus: true,
  es_capitan: false,
  curp: '',
  email: '',
};

export default function Teams() {
  const { tournaments } = useApp();
  const { usuario } = useAuth();
  const isHost = usuario?.roles?.includes('anfitrion') ?? false;

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState<TeamForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewTeam, setViewTeam] = useState<Team | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [playerCounts, setPlayerCounts] = useState<Record<number, number>>({});

  // Players state
  const [playersTeam, setPlayersTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerForm, setPlayerForm] = useState<PlayerForm>(emptyPlayerForm);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [deletePlayerId, setDeletePlayerId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<number | null>(null);
  const [viewPhoto, setViewPhoto] = useState<{ url: string; nombre: string } | null>(null);
  const [viewQR, setViewQR] = useState<{ codigo: string; nombre: string } | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getEquipos();
      setTeams(data);
      setError(null);
      // Cargar conteo de jugadores por equipo
      const counts: Record<number, number> = {};
      await Promise.all(
        data.map(async (t: Team) => {
          try {
            const jugadores = await api.getJugadores(t.id);
            counts[t.id] = Array.isArray(jugadores) ? jugadores.length : 0;
          } catch {
            counts[t.id] = 0;
          }
        })
      );
      setPlayerCounts(counts);
    } catch (err) {
      setError('Error al cargar los equipos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const filteredTeams = selectedTournament
    ? teams.filter(t => t.torneo_id === Number(selectedTournament))
    : teams;

  // Team CRUD
  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      torneo_id: selectedTournament ? Number(selectedTournament) : (tournaments[0]?.id || 0),
    });
    setModalOpen(true);
  };

  const openEdit = (t: Team) => {
    setEditing(t);
    setForm({
      torneo_id: t.torneo_id,
      nombre: t.nombre,
      logo: t.logo,
      estatus: t.estatus,
      inscripcion_pagada: t.inscripcion_pagada,
      monto_pagado: t.monto_pagado,
      fecha_pago_inscripcion: t.fecha_pago_inscripcion,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.torneo_id) return;
    setSaving(true);
    try {
      if (editing) {
        const { torneo_id, ...updateData } = form;
        await api.updateEquipo(editing.id, {
          ...updateData,
          fecha_creacion: editing.fecha_creacion,
        });
      } else {
        await api.createEquipo({
          ...form,
          fecha_creacion: new Date().toISOString().slice(0, 19),
        });
      }
      await fetchTeams();
      setModalOpen(false);
      setToast({ message: editing ? 'Equipo actualizado correctamente' : 'Equipo creado correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al guardar el equipo', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.deleteEquipo(deleteId);
      await fetchTeams();
      setToast({ message: 'Equipo eliminado correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al eliminar el equipo', type: 'error' });
    }
    setDeleteId(null);
  };

  // Players
  const openPlayers = async (t: Team) => {
    setPlayersTeam(t);
    setLoadingPlayers(true);
    try {
      const data = await api.getJugadores(t.id);
      setPlayers(Array.isArray(data) ? data : [data]);
    } catch (err) {
      console.error(err);
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const refreshPlayers = async () => {
    if (!playersTeam) return;
    try {
      const data = await api.getJugadores(playersTeam.id);
      const list = Array.isArray(data) ? data : [data];
      setPlayers(list);
      setPlayerCounts(prev => ({ ...prev, [playersTeam.id]: list.length }));
    } catch {
      setPlayers([]);
    }
  };

  const openCreatePlayer = () => {
    setEditingPlayer(null);
    setPlayerForm(emptyPlayerForm);
    setPlayerModalOpen(true);
  };

  const openEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setPlayerForm({
      nombre: p.nombre,
      numero: p.numero,
      posicion: p.posicion,
      estatus: p.estatus,
      es_capitan: p.es_capitan || false,
      curp: p.curp || '',
      email: '',
    });
    setPlayerModalOpen(true);
  };

  const handleSavePlayer = async () => {
    if (!playerForm.nombre.trim() || !playersTeam) return;
    if (playerForm.es_capitan && !playerForm.email.trim()) {
      setToast({ message: 'El email es obligatorio para capitanes', type: 'error' });
      return;
    }
    const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
    const nombre = toTitleCase(playerForm.nombre.trim());
    setSavingPlayer(true);
    try {
      if (editingPlayer) {
        await api.updateJugador(editingPlayer.id, {
          nombre,
          numero: playerForm.numero,
          posicion: playerForm.posicion,
          estatus: playerForm.estatus,
          es_capitan: playerForm.es_capitan,
          fecha_creacion: editingPlayer.fecha_creacion,
          foto: editingPlayer.foto,
          curp: playerForm.curp || null,
        });
      } else {
        await api.createJugador({
          equipo_id: playersTeam.id,
          nombre,
          numero: playerForm.numero,
          posicion: playerForm.posicion,
          estatus: playerForm.estatus,
          es_capitan: playerForm.es_capitan,
          fecha_creacion: new Date().toISOString(),
          foto: null,
          curp: playerForm.curp || null,
        });
      }
      // Si es capitán, crear usuario y asociar
      if (playerForm.es_capitan && playerForm.email.trim()) {
        try {
          // Obtener el jugador creado/editado
          const updatedPlayers = await api.getJugadores(playersTeam.id);
          const jugadorList = Array.isArray(updatedPlayers) ? updatedPlayers : [];
          const jugador = editingPlayer
            ? editingPlayer
            : jugadorList.find((j: any) => j.nombre === nombre && j.equipo_id === playersTeam.id);

          if (jugador) {
            await api.createUsuario({
              email: playerForm.email.trim(),
              password: 'root',
              nombre,
              roles: ['jugador'],
              jugador_id: jugador.id,
            });
          }
        } catch (err: any) {
          console.error('Error creando usuario:', err);
        }
      }
      await refreshPlayers();
      setPlayerModalOpen(false);
      setToast({ message: editingPlayer ? 'Jugador actualizado correctamente' : 'Jugador creado correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al guardar el jugador', type: 'error' });
    } finally {
      setSavingPlayer(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (deletePlayerId === null) return;
    try {
      await api.deleteJugador(deletePlayerId);
      await refreshPlayers();
      setToast({ message: 'Jugador eliminado correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al eliminar el jugador', type: 'error' });
    }
    setDeletePlayerId(null);
  };

  const handleUploadPhoto = (playerId: number) => {
    setUploadingPhotoId(playerId);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingPhotoId === null) return;
    try {
      await api.uploadFotoJugador(uploadingPhotoId, file);
      await refreshPlayers();
      setToast({ message: 'Foto subida correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al subir la foto', type: 'error' });
    }
    setUploadingPhotoId(null);
    e.target.value = '';
  };

  const getTournamentName = (id: number) => tournaments.find(t => t.id === id)?.nombre || '—';

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state"><p>Cargando equipos...</p></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchTeams}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Equipos</h2>
        {isHost && <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nuevo Equipo</button>}
      </div>

      {/* Filter + View Toggle */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}>
          <option value="">Todos los torneos</option>
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

      {filteredTeams.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>No hay equipos registrados</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="card-grid">
          {[...filteredTeams].sort((a, b) => a.id - b.id).map(t => (
            <div key={t.id} className="card">
              <div className="card-header-row">
                <img src={t.logo && t.logo !== 'Desconocido' ? t.logo : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t.nombre) + '&background=6366f1&color=fff&size=64'} alt="" className="card-logo" />
                <div>
                  <h3 className="card-title">{t.nombre}</h3>
                  <span className={`badge badge-${t.estatus ? 'active' : 'inactive'}`}>{t.estatus ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
              <div className="card-details">
                <p><strong>Torneo:</strong> {getTournamentName(t.torneo_id)}</p>
                <p><strong>Inscripción:</strong>{' '}
                  <span className={`badge ${t.inscripcion_pagada ? 'badge-active' : 'badge-inactive'}`}>{t.inscripcion_pagada ? 'Pagada' : 'Pendiente'}</span>
                </p>
              </div>
              <div className="card-actions">
                <button className="btn btn-sm btn-ghost" onClick={() => openPlayers(t)}><Users size={16} /> Jugadores ({playerCounts[t.id] ?? 0})</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setViewTeam(t)}><Eye size={16} /> Ver</button>
                {isHost && (
                  <>
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)}><Edit size={16} /> Editar</button>
                    <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteId(t.id)}><Trash2 size={16} /></button>
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
                <th>Logo</th>
                <th>Nombre</th>
                <th>Torneo</th>
                <th>Estatus</th>
                <th>Inscripción</th>
                <th>Monto</th>
                <th>Jugadores</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[...filteredTeams].sort((a, b) => a.id - b.id).map(t => (
                <tr key={t.id}>
                  <td>
                    <img src={t.logo && t.logo !== 'Desconocido' ? t.logo : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t.nombre) + '&background=6366f1&color=fff&size=32'} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  </td>
                  <td><strong>{t.nombre}</strong></td>
                  <td>{getTournamentName(t.torneo_id)}</td>
                  <td><span className={`badge badge-${t.estatus ? 'active' : 'inactive'}`}>{t.estatus ? 'Activo' : 'Inactivo'}</span></td>
                  <td><span className={`badge ${t.inscripcion_pagada ? 'badge-active' : 'badge-inactive'}`}>{t.inscripcion_pagada ? 'Pagada' : 'Pendiente'}</span></td>
                  <td>{t.monto_pagado !== null ? `$${t.monto_pagado}` : '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => openPlayers(t)} title="Jugadores"><Users size={16} /> {playerCounts[t.id] ?? 0}</button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => setViewTeam(t)} title="Ver"><Eye size={16} /></button>
                      {isHost && (
                        <>
                          <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)} title="Editar"><Edit size={16} /></button>
                          <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteId(t.id)} title="Eliminar"><Trash2 size={16} /></button>
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

      {/* Create/Edit Team Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Equipo' : 'Nuevo Equipo'}>
        <div className="form-stack">
          <div className="form-group">
            <label>Nombre *</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Golden" />
          </div>
          {!editing && (
            <div className="form-group">
              <label>Torneo *</label>
              <select value={form.torneo_id} onChange={e => setForm({ ...form, torneo_id: Number(e.target.value) })}>
                <option value={0}>Seleccionar...</option>
                {[...tournaments].sort((a, b) => a.id - b.id).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Logo (URL)</label>
            <input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.estatus} onChange={e => setForm({ ...form, estatus: e.target.checked })} />
              Activo
            </label>
          </div>
          <div className="form-group">
            <label>Monto pagado ($)</label>
            <input type="number" value={form.monto_pagado ?? ''} onChange={e => setForm({ ...form, monto_pagado: e.target.value ? Number(e.target.value) : null })} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Fecha de pago</label>
            <input type="date" value={form.fecha_pago_inscripcion?.split('T')[0] || ''} onChange={e => setForm({ ...form, fecha_pago_inscripcion: e.target.value ? `${e.target.value}T00:00:00` : null })} />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.inscripcion_pagada} onChange={e => setForm({ ...form, inscripcion_pagada: e.target.checked })} />
              Inscripción pagada en su totalidad
            </label>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear equipo'}
          </button>
        </div>
      </Modal>

      {/* View Team Modal */}
      <Modal open={!!viewTeam} onClose={() => setViewTeam(null)} title={viewTeam?.nombre || ''}>
        {viewTeam && (
          <div className="detail-grid">
            <p><strong>Torneo:</strong> {getTournamentName(viewTeam.torneo_id)}</p>
            <p><strong>Estatus:</strong> {viewTeam.estatus ? 'Activo' : 'Inactivo'}</p>
            <p><strong>Inscripción:</strong> {viewTeam.inscripcion_pagada ? 'Pagada' : 'Pendiente'}</p>
            {viewTeam.monto_pagado !== null && <p><strong>Monto pagado:</strong> ${viewTeam.monto_pagado}</p>}
            {viewTeam.fecha_pago_inscripcion && <p><strong>Fecha de pago:</strong> {new Date(viewTeam.fecha_pago_inscripcion).toLocaleDateString()}</p>}
            <p><strong>Fecha de creación:</strong> {new Date(viewTeam.fecha_creacion).toLocaleDateString()}</p>
          </div>
        )}
      </Modal>

      {/* Players Modal */}
      <Modal open={!!playersTeam} onClose={() => setPlayersTeam(null)} title={`Jugadores — ${playersTeam?.nombre || ''}`} extraWide>
        {loadingPlayers ? (
          <p>Cargando jugadores...</p>
        ) : (
          <div>
            {isHost && (
              <div style={{ marginBottom: '1rem' }}>
                <button className="btn btn-primary btn-sm" onClick={openCreatePlayer}><UserPlus size={16} /> Agregar Jugador</button>
              </div>
            )}
            {players.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No hay jugadores registrados en este equipo.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Nombre</th>
                      <th>#</th>
                      <th>Posición</th>
                      <th>Capitán</th>
                      <th>Estatus</th>
                      <th>CURP</th>
                      <th>Email</th>
                      <th>QR</th>
                      {isHost && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {[...players].sort((a, b) => a.id - b.id).map(p => (
                      <tr key={p.id}>
                        <td>
                          <img
                            src={getFileUrl(p.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.nombre) + '&background=6366f1&color=fff&size=32'}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => setViewPhoto({ url: getFileUrl(p.foto) || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.nombre) + '&background=6366f1&color=fff&size=256', nombre: p.nombre })}
                          />
                        </td>
                        <td><strong>{p.nombre}</strong></td>
                        <td>{p.numero}</td>
                        <td>{p.posicion}</td>
                        <td className="text-center">{p.es_capitan ? '⭐' : '—'}</td>
                        <td><span className={`badge badge-${p.estatus ? 'active' : 'inactive'}`}>{p.estatus ? 'Activo' : 'Inactivo'}</span></td>
                        <td>{p.curp || '—'}</td>
                        <td>{p.email || '—'}</td>
                        <td className="text-center">
                          {p.codigo_qr ? (
                            <button className="btn btn-sm btn-ghost" onClick={() => setViewQR({ codigo: p.codigo_qr, nombre: p.nombre })} title="Ver QR">
                              <QrCode size={16} />
                            </button>
                          ) : '—'}
                        </td>
                        {isHost && (
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-sm btn-ghost" onClick={() => handleUploadPhoto(p.id)} title="Subir foto"><Upload size={14} /></button>
                              <button className="btn btn-sm btn-ghost" onClick={() => openEditPlayer(p)} title="Editar"><Edit size={14} /></button>
                              <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeletePlayerId(p.id)} title="Eliminar"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileSelected} />
      </Modal>

      {/* Create/Edit Player Modal */}
      <Modal open={playerModalOpen} onClose={() => setPlayerModalOpen(false)} title={editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}>
        <div className="form-stack">
          <div className="form-group">
            <label>Nombre completo *</label>
            <input value={playerForm.nombre} onChange={e => setPlayerForm({ ...playerForm, nombre: e.target.value })} placeholder="Ej: Juan Pérez" />
          </div>
          <div className="form-group">
            <label>Número</label>
            <input
              type="text"
              inputMode="numeric"
              value={playerForm.numero || ''}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^\d+$/.test(val)) {
                  setPlayerForm({ ...playerForm, numero: val === '' ? 0 : Number(val) });
                }
              }}
              placeholder="Ej: 10"
            />
          </div>
          <div className="form-group">
            <label>Posición</label>
            <select value={playerForm.posicion} onChange={e => setPlayerForm({ ...playerForm, posicion: e.target.value })}>
              <option value="">Seleccionar...</option>
              <option value="Setter">Setter</option>
              <option value="Libero">Líbero</option>
              <option value="Centro">Centro</option>
              <option value="Opuesto">Opuesto</option>
              <option value="Punta">Punta</option>
              <option value="Universal">Universal</option>
            </select>
          </div>
          <div className="form-group">
            <label>CURP</label>
            <input value={playerForm.curp} onChange={e => setPlayerForm({ ...playerForm, curp: e.target.value.slice(0, 18).toUpperCase() })} placeholder="Opcional" maxLength={18} />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={playerForm.estatus} onChange={e => setPlayerForm({ ...playerForm, estatus: e.target.checked })} />
              Activo
            </label>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={playerForm.es_capitan} onChange={e => setPlayerForm({ ...playerForm, es_capitan: e.target.checked })} />
              Capitán
            </label>
          </div>
          {playerForm.es_capitan && (
            <div className="form-group">
              <label>Email del capitán *</label>
              <input type="email" value={playerForm.email} onChange={e => setPlayerForm({ ...playerForm, email: e.target.value })} placeholder="correo@ejemplo.com" />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setPlayerModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSavePlayer} disabled={savingPlayer}>
            {savingPlayer ? 'Guardando...' : editingPlayer ? 'Guardar cambios' : 'Crear jugador'}
          </button>
        </div>
      </Modal>

      {/* View QR Modal */}
      <Modal open={!!viewQR} onClose={() => setViewQR(null)} title={viewQR ? `QR — ${viewQR.nombre}` : ''}>
        {viewQR && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', gap: '1rem' }}>
            <QRCodeSVG value={viewQR.codigo} size={200} />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-all', textAlign: 'center' }}>{viewQR.codigo}</p>
          </div>
        )}
      </Modal>

      {/* View Photo Modal */}
      <Modal open={!!viewPhoto} onClose={() => setViewPhoto(null)} title={viewPhoto?.nombre || 'Foto'}>
        {viewPhoto && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
            <img
              src={viewPhoto.url}
              alt={viewPhoto.nombre}
              style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 'var(--radius)', objectFit: 'contain' }}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} message="¿Eliminar este equipo?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <ConfirmDialog open={!!deletePlayerId} message="¿Eliminar este jugador?" onConfirm={handleDeletePlayer} onCancel={() => setDeletePlayerId(null)} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
