import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit, Trash2, Eye, MapPin, LayoutGrid, List } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import type { Tournament, Ubicacion } from '@/types';
import { api } from '@/services/api';
import { formatDate } from '@/utils/dateUtils';

interface TournamentForm {
  nombre: string;
  reglamento: string;
  logo: string;
  publicado: boolean;
  periodo: string;
  categoria: string;
  numero_vueltas: number;
  anfitrion_id: number;
}

interface UbicacionForm {
  nombre: string;
  direccion: string;
  ubicacion: string;
}

const emptyForm: TournamentForm = {
  nombre: '',
  reglamento: '',
  logo: '',
  publicado: true,
  periodo: '',
  categoria: '',
  numero_vueltas: 1,
  anfitrion_id: 0,
};

export default function Tournaments() {
  const { refreshTournaments: refreshContextTournaments } = useApp();
  const { usuario } = useAuth();
  const isHost = usuario?.roles?.includes('anfitrion') ?? false;
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewTournament, setViewTournament] = useState<Tournament | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Ubicaciones
  const [ubicacionesModal, setUbicacionesModal] = useState<Tournament | null>(null);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [ubicacionForm, setUbicacionForm] = useState<UbicacionForm>({ nombre: '', direccion: '', ubicacion: '' });
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(false);

  const fetchTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTournaments();
      setTournaments(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los torneos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, anfitrion_id: usuario?.anfitrion_id || 0 });
    setModalOpen(true);
  };

  const openEdit = (t: Tournament) => {
    setEditing(t);
    setForm({
      nombre: t.nombre,
      reglamento: t.reglamento,
      logo: t.logo,
      publicado: t.publicado,
      periodo: t.periodo,
      categoria: t.categoria,
      numero_vueltas: t.numero_vueltas || 1,
      anfitrion_id: t.anfitrion_id,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.updateTournament(editing.id, form);
      } else {
        await api.createTournament(form);
      }
      await fetchTournaments();
      setModalOpen(false);
      setToast({ message: editing ? 'Torneo actualizado correctamente' : 'Torneo creado correctamente', type: 'success' });
      await refreshContextTournaments();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al guardar el torneo', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await api.deleteTournament(deleteId);
      await fetchTournaments();
      setToast({ message: 'Torneo eliminado correctamente', type: 'success' });
      await refreshContextTournaments();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al eliminar el torneo', type: 'error' });
    }
    setDeleteId(null);
  };

  // Ubicaciones
  const [editingUbicacion, setEditingUbicacion] = useState<Ubicacion | null>(null);
  const [showUbicacionForm, setShowUbicacionForm] = useState(false);
  const [ubicacionViewMode, setUbicacionViewMode] = useState<'cards' | 'table'>('table');

  const openUbicaciones = async (t: Tournament) => {
    setUbicacionesModal(t);
    setEditingUbicacion(null);
    setShowUbicacionForm(false);
    setUbicaciones(t.ubicaciones || []);
    setLoadingUbicaciones(false);
  };

  const handleAddUbicacion = async () => {
    if (!ubicacionesModal || !ubicacionForm.nombre.trim()) return;
    try {
      await api.createUbicacion(ubicacionesModal.id, ubicacionForm);
      await fetchTournaments();
      const updated = await api.getTournament(ubicacionesModal.id);
      setUbicaciones(updated.ubicaciones || []);
      setUbicacionForm({ nombre: '', direccion: '', ubicacion: '' });
      setShowUbicacionForm(false);
      setToast({ message: 'Ubicación agregada correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al agregar ubicación', type: 'error' });
    }
  };

  const handleEditUbicacion = (u: Ubicacion) => {
    setEditingUbicacion(u);
    setUbicacionForm({ nombre: u.nombre, direccion: u.direccion || '', ubicacion: u.ubicacion });
    setShowUbicacionForm(true);
  };

  const handleUpdateUbicacion = async () => {
    if (!ubicacionesModal || !editingUbicacion || !ubicacionForm.nombre.trim()) return;
    try {
      await api.updateUbicacion(ubicacionesModal.id, editingUbicacion.id, ubicacionForm);
      await fetchTournaments();
      const updated = await api.getTournament(ubicacionesModal.id);
      setUbicaciones(updated.ubicaciones || []);
      setUbicacionForm({ nombre: '', direccion: '', ubicacion: '' });
      setEditingUbicacion(null);
      setShowUbicacionForm(false);
      setToast({ message: 'Ubicación actualizada correctamente', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al actualizar ubicación', type: 'error' });
    }
  };

  const handleCancelEditUbicacion = () => {
    setEditingUbicacion(null);
    setShowUbicacionForm(false);
    setUbicacionForm({ nombre: '', direccion: '', ubicacion: '' });
  };

  const handleDeleteUbicacion = async (ubicacionId: number) => {
    if (!ubicacionesModal) return;
    try {
      await api.deleteUbicacion(ubicacionesModal.id, ubicacionId);
      await fetchTournaments();
      const updated = await api.getTournament(ubicacionesModal.id);
      setUbicaciones(updated.ubicaciones || []);
      setToast({ message: 'Ubicación eliminada correctamente', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Error al eliminar ubicación', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Cargando torneos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchTournaments}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Torneos</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('cards')}
              title="Vista tarjetas"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('table')}
              title="Vista tabla"
            >
              <List size={16} />
            </button>
          </div>
          {isHost && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={18} /> Nuevo Torneo
            </button>
          )}
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="empty-state">
          <Trophy size={48} />
          <p>No hay torneos registrados</p>
          {isHost && <button className="btn btn-primary" onClick={openCreate}>Crear primer torneo</button>}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="card-grid">
          {[...tournaments].sort((a, b) => a.id - b.id).map(t => (
            <div key={t.id} className="card">
              <div className="card-header-row">
                <img src={t.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t.nombre) + '&background=3b82f6&color=fff&size=64'} alt="" className="card-logo" />
                <div>
                  <h3 className="card-title">{t.nombre}</h3>
                  <span className={`badge badge-${t.publicado ? 'active' : 'inactive'}`}>
                    {t.publicado ? 'Publicado' : 'No publicado'}
                  </span>
                </div>
              </div>
              <div className="card-details">
                <p><strong>Periodo:</strong> {t.periodo}</p>
                <p><strong>Categoría:</strong> {t.categoria}</p>
                <p><strong>Ubicaciones:</strong> {t.ubicaciones?.length || 0}</p>
              </div>
              <div className="card-actions">
                <button className="btn btn-sm btn-ghost" onClick={() => setViewTournament(t)}><Eye size={16} /> Ver</button>
                <button className="btn btn-sm btn-ghost" onClick={() => openUbicaciones(t)}><MapPin size={16} /> Ubicaciones</button>
                {isHost && (
                  <>
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)}><Edit size={16} /> Editar</button>
                    <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteId(t.id)}><Trash2 size={16} /> Eliminar</button>
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
                <th>Periodo</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Ubicaciones</th>
                {isHost && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {[...tournaments].sort((a, b) => a.id - b.id).map(t => (
                <tr key={t.id}>
                  <td>
                    <img
                      src={t.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(t.nombre) + '&background=3b82f6&color=fff&size=32'}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  </td>
                  <td><strong>{t.nombre}</strong></td>
                  <td>{t.periodo}</td>
                  <td>{t.categoria}</td>
                  <td>
                    <span className={`badge badge-${t.publicado ? 'active' : 'inactive'}`}>
                      {t.publicado ? 'Publicado' : 'No publicado'}
                    </span>
                  </td>
                  <td>{t.ubicaciones?.length || 0}</td>
                  {isHost && (
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => setViewTournament(t)}><Eye size={16} /></button>
                        <button className="btn btn-sm btn-ghost" onClick={() => openUbicaciones(t)}><MapPin size={16} /></button>
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(t)}><Edit size={16} /></button>
                        <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeleteId(t.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Torneo' : 'Nuevo Torneo'} wide>
        <div className="form-grid">
          <div className="form-group">
            <label>Nombre del torneo *</label>
            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Torneo de Verano 2026" />
          </div>
          <div className="form-group">
            <label>Logo (URL)</label>
            <input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Periodo</label>
            <input value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} placeholder="Ej: 1 de diciembre a 20 de enero" />
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Ej: Mixto - Libre, Femenil - 96" />
          </div>
          <div className="form-group">
            <label>Reglamento (URL)</label>
            <input value={form.reglamento} onChange={e => setForm({ ...form, reglamento: e.target.value })} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Número de vueltas *</label>
            <input type="number" min={1} value={form.numero_vueltas} onChange={e => setForm({ ...form, numero_vueltas: Number(e.target.value) })} />
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={form.publicado} onChange={e => setForm({ ...form, publicado: e.target.checked })} />
              Publicado
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear torneo'}
          </button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewTournament} onClose={() => setViewTournament(null)} title={viewTournament?.nombre || ''} wide>
        {viewTournament && (
          <div>
            <img src={viewTournament.logo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(viewTournament.nombre) + '&background=3b82f6&color=fff&size=128'} alt="" className="detail-logo" />
            <div className="detail-grid">
              <p><strong>Periodo:</strong> {viewTournament.periodo}</p>
              <p><strong>Categoría:</strong> {viewTournament.categoria}</p>
              <p><strong>Publicado:</strong> {viewTournament.publicado ? 'Sí' : 'No'}</p>
              {viewTournament.fecha_creacion && (
                <p><strong>Fecha de creación:</strong> {formatDate(viewTournament.fecha_creacion)}</p>
              )}
            </div>
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Link público del torneo:</p>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  readOnly
                  value={`${window.location.origin}/torneo/${viewTournament.id}`}
                  style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', background: 'white' }}
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button className="btn btn-sm btn-primary" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/torneo/${viewTournament.id}`); setToast({ message: 'Link copiado', type: 'success' }); }}>Copiar</button>
              </div>
            </div>
            {viewTournament.reglamento && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Reglamento:</strong>
                <a href={viewTournament.reglamento} target="_blank" rel="noopener noreferrer" className="court-map-link" style={{ marginLeft: '0.5rem' }}>
                  Ver reglamento
                </a>
              </div>
            )}
            {viewTournament.ubicaciones && viewTournament.ubicaciones.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>Ubicaciones:</strong>
                <div className="courts-list">
                  {viewTournament.ubicaciones.map(u => (
                    <div key={u.id} className="court-card">
                      <p className="court-name">{u.nombre}</p>
                      {u.ubicacion && (
                        <a href={u.ubicacion} target="_blank" rel="noopener noreferrer" className="court-map-link">
                          <MapPin size={14} /> Ver en mapa
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Ubicaciones Modal */}
      <Modal open={!!ubicacionesModal} onClose={() => setUbicacionesModal(null)} title={`Ubicaciones - ${ubicacionesModal?.nombre || ''}`} wide>
        {loadingUbicaciones ? (
          <p>Cargando ubicaciones...</p>
        ) : (
          <div>
            {ubicaciones.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No hay ubicaciones registradas</p>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className={`btn btn-sm ${ubicacionViewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setUbicacionViewMode('cards')} title="Vista tarjetas">
                      <LayoutGrid size={16} />
                    </button>
                    <button className={`btn btn-sm ${ubicacionViewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setUbicacionViewMode('table')} title="Vista tabla">
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {ubicacionViewMode === 'table' ? (
                  <div className="table-wrapper" style={{ marginBottom: '1.5rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Dirección</th>
                          <th>Mapa</th>
                          {isHost && <th>Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {[...ubicaciones].sort((a, b) => a.id - b.id).map(u => (
                          <tr key={u.id}>
                            <td><strong>{u.nombre}</strong></td>
                            <td>{u.direccion || '—'}</td>
                            <td>{u.ubicacion ? <a href={u.ubicacion} target="_blank" rel="noopener noreferrer" className="court-map-link"><MapPin size={14} /> Ver</a> : '—'}</td>
                            {isHost && (
                              <td>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                  <button className="btn btn-sm btn-ghost" onClick={() => handleEditUbicacion(u)} title="Editar"><Edit size={16} /></button>
                                  <button className="btn btn-sm btn-ghost text-danger" onClick={() => handleDeleteUbicacion(u.id)} title="Eliminar"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="courts-list" style={{ marginBottom: '1.5rem' }}>
                    {[...ubicaciones].sort((a, b) => a.id - b.id).map(u => (
                      <div key={u.id} className="court-card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: u.ubicacion ? '0.75rem' : '0.5rem' }}>
                          <div>
                            <p className="court-name">{u.nombre}</p>
                            {u.direccion && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.direccion}</p>}
                          </div>
                          {isHost && (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-sm btn-ghost" onClick={() => handleEditUbicacion(u)}><Edit size={16} /></button>
                              <button className="btn btn-sm btn-ghost text-danger" onClick={() => handleDeleteUbicacion(u.id)}><Trash2 size={16} /></button>
                            </div>
                          )}
                        </div>
                        {u.ubicacion && (
                          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <iframe
                              src={`https://maps.google.com/maps?q=${encodeURIComponent(u.nombre + (u.direccion ? ' ' + u.direccion : ''))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                              width="100%"
                              height="200"
                              style={{ border: 0, display: 'block' }}
                              allowFullScreen
                              loading="lazy"
                              referrerPolicy="no-referrer-when-downgrade"
                              title={`Mapa - ${u.nombre}`}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {isHost && !showUbicacionForm && (
              <button className="btn btn-primary btn-sm" onClick={() => { setShowUbicacionForm(true); setEditingUbicacion(null); setUbicacionForm({ nombre: '', direccion: '', ubicacion: '' }); }}>
                <Plus size={16} /> Agregar ubicación
              </button>
            )}

            {isHost && showUbicacionForm && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>{editingUbicacion ? 'Editar ubicación' : 'Nueva ubicación'}</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nombre *</label>
                    <input value={ubicacionForm.nombre} onChange={e => setUbicacionForm({ ...ubicacionForm, nombre: e.target.value })} placeholder="Ej: Municipio Acolman" />
                  </div>
                  <div className="form-group">
                    <label>Dirección</label>
                    <input value={ubicacionForm.direccion} onChange={e => setUbicacionForm({ ...ubicacionForm, direccion: e.target.value })} placeholder="Ej: Av. Principal #123" />
                  </div>
                  <div className="form-group">
                    <label>URL de ubicación (Google Maps)</label>
                    <input value={ubicacionForm.ubicacion} onChange={e => setUbicacionForm({ ...ubicacionForm, ubicacion: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  {editingUbicacion ? (
                    <>
                      <button className="btn btn-primary" onClick={handleUpdateUbicacion}>
                        Guardar cambios
                      </button>
                      <button className="btn btn-secondary" onClick={handleCancelEditUbicacion}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-primary" onClick={handleAddUbicacion}>
                        Guardar
                      </button>
                      <button className="btn btn-secondary" onClick={handleCancelEditUbicacion}>
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} message="¿Estás seguro de eliminar este torneo?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Trophy({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
}
