import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Plus, Edit, Trash2, Eye, Calendar, LayoutGrid, List, Share2, UserCheck, Save } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import type { Matchday, Partido, PartidoSet, CombinacionPendiente, PartidoArbitraje } from '@/types';
import { api, getFileUrl } from '@/services/api';
import { formatDate } from '@/utils/dateUtils';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';

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
  fecha_hora: string;
  estatus: string;
  tipo: string;
  observaciones: string;
}

const emptyJornadaForm: JornadaForm = { numero: 1, fecha: '', estatus: false };
const emptyPartidoForm: PartidoForm = {
  equipo_local_id: 0, equipo_visitante_id: 0,
  puntos_local: 0, puntos_visitante: 0,
  ubicacion_id: 0, fecha_hora: '', estatus: 'Por jugar', tipo: '', observaciones: '',
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
  const [inlineScores, setInlineScores] = useState<Record<number, { puntos_local: number; puntos_visitante: number }>>({});
  const [savingInlineId, setSavingInlineId] = useState<number | null>(null);
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
  const [localArbitrajes, setLocalArbitrajes] = useState<PartidoArbitraje[]>([]);
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
        api.getEquipos({ torneo_id: torneoId }),
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
      // Usar arbitrajes incluidos en cada partido
      const arbMap: Record<number, PartidoArbitraje[]> = {};
      list.forEach((p: any) => {
        arbMap[p.id] = Array.isArray(p.arbitrajes) ? p.arbitrajes : [];
      });
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
      // Usar arbitrajes incluidos en cada partido
      const arbMap: Record<number, PartidoArbitraje[]> = {};
      list.forEach((p: any) => {
        arbMap[p.id] = Array.isArray(p.arbitrajes) ? p.arbitrajes : [];
      });
      setPartidosArbitrajes(arbMap);
    } catch { setPartidos([]); }
  };

  const saveInlineScore = async (partidoId: number) => {
    const scores = inlineScores[partidoId];
    if (!scores) return;
    setSavingInlineId(partidoId);
    try {
      await api.updatePartido(partidoId, {
        puntos_local: scores.puntos_local,
        puntos_visitante: scores.puntos_visitante,
        estatus: (scores.puntos_local > 0 || scores.puntos_visitante > 0) ? 'Jugado' : 'Por jugar',
      });
      setInlineScores(prev => { const next = { ...prev }; delete next[partidoId]; return next; });
      await refreshPartidos();
      await checkJornadaCompleta();
      setToast({ message: 'Resultado guardado', type: 'success' });
    } catch {
      setToast({ message: 'Error al guardar resultado', type: 'error' });
    } finally {
      setSavingInlineId(null);
    }
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
      fecha_hora: p.fecha_hora?.slice(0, 16) || (viewJornada?.fecha ? viewJornada.fecha.split('T')[0] + 'T07:00' : ''),
      estatus: (p.puntos_local > 0 || p.puntos_visitante > 0) ? 'Jugado' : (p.estatus || 'Por jugar'),
      tipo: p.tipo || 'Oficial',
      observaciones: p.observaciones || '',
    });
    setPartidoModalOpen(true);
    // Usar sets y arbitrajes incluidos en el partido
    const pAny = p as any;
    const setsFromPartido = Array.isArray(pAny.sets) ? pAny.sets : [];
    const arbsFromPartido = Array.isArray(pAny.arbitrajes) ? pAny.arbitrajes : [];
    setSets(setsFromPartido);
    setLocalSets(setsFromPartido.map((s: any) => ({ id: s.id, marcador_local: s.marcador_local, marcador_visitante: s.marcador_visitante })));
    setLocalArbitrajes(arbsFromPartido.map((a: any) => ({ ...a })));
    setLoadingSets(false);
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
        fecha_hora: partidoForm.fecha_hora || null,
        estatus: (partidoForm.puntos_local > 0 || partidoForm.puntos_visitante > 0) ? 'Jugado' : (partidoForm.estatus || 'Por jugar'),
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
        // Guardar arbitrajes editados
        if (localArbitrajes.length > 0) {
          await Promise.all(
            localArbitrajes.map(arb => api.updateArbitraje(arb.id, {
              partido_id: arb.partido_id,
              equipo_id: arb.equipo_id,
              pagado: arb.pagado,
              monto: arb.monto,
              fecha_pago: arb.fecha_pago,
              observaciones: arb.observaciones,
            }))
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
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || 'Error al eliminar partido', type: 'error' });
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

  const handleUpdateArbitraje = (arb: PartidoArbitraje, updates: Partial<PartidoArbitraje>) => {
    setLocalArbitrajes(prev => prev.map(a => a.id === arb.id ? { ...a, ...updates } : a));
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
            ubicacion_id: null, fecha_hora: null, estatus: 'Por jugar', tipo: 'Oficial', observaciones: null,
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

  // Compartir jornada como imagen
  const flyerRef = useRef<HTMLDivElement>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingJornada, setSharingJornada] = useState<Matchday | null>(null);
  const [sharePartidos, setSharePartidos] = useState<Partido[]>([]);

  // Asistencias manuales
  const [asistenciaModalOpen, setAsistenciaModalOpen] = useState(false);
  const [asistenciaPartido, setAsistenciaPartido] = useState<Partido | null>(null);
  const [asistenciaJugadoresLocal, setAsistenciaJugadoresLocal] = useState<any[]>([]);
  const [asistenciaJugadoresVisitante, setAsistenciaJugadoresVisitante] = useState<any[]>([]);
  const [asistenciaRegistradas, setAsistenciaRegistradas] = useState<any[]>([]);
  const [selectedAsistLocal, setSelectedAsistLocal] = useState<Set<number>>(new Set());
  const [selectedAsistVisitante, setSelectedAsistVisitante] = useState<Set<number>>(new Set());
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [savingAsistencia, setSavingAsistencia] = useState(false);

  // Importar JSON
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importPreview, setImportPreview] = useState<{ local: string; visitante: string; fecha_hora: string; equipo_local_id: number; equipo_visitante_id: number; ubicacion_id: number; tipo: string; error?: string }[]>([]);
  const [importTipo, setImportTipo] = useState('Oficial');
  const [savingImport, setSavingImport] = useState(false);

  // Importar Resultados con IA
  const [importResultsOpen, setImportResultsOpen] = useState(false);
  const [importResultsJson, setImportResultsJson] = useState('');
  const [importResultsPreview, setImportResultsPreview] = useState<{ local: string; visitante: string; puntos_local: number; puntos_visitante: number; error?: string }[]>([]);
  const [savingResults, setSavingResults] = useState(false);

  // Historial de equipo
  const [historialModalOpen, setHistorialModalOpen] = useState(false);
  const [historialEquipoId, setHistorialEquipoId] = useState<number>(0);
  const [historialPartidos, setHistorialPartidos] = useState<Partido[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [editFromHistorial, setEditFromHistorial] = useState(false);

  const openHistorial = async (equipoId: number) => {
    if (!torneoId || !equipoId) return;
    setHistorialEquipoId(equipoId);
    setHistorialModalOpen(true);
    setLoadingHistorial(true);
    try {
      const data = await api.getPartidosEquipo(equipoId, torneoId);
      const list = Array.isArray(data) ? data : [];
      setHistorialPartidos(list);
    } catch {
      setHistorialPartidos([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const parseImportJson = () => {
    try {
      const raw = JSON.parse(importJson);
      if (!Array.isArray(raw)) { setToast({ message: 'El JSON debe ser un arreglo', type: 'error' }); return; }
      const preview = raw.map((item: any) => {
        const localName = (item.local || '').toUpperCase().trim();
        const visitanteName = (item.visitante || '').toUpperCase().trim();
        const localTeam = tournamentTeams.find(t => t.nombre.toUpperCase() === localName);
        const visitanteTeam = tournamentTeams.find(t => t.nombre.toUpperCase() === visitanteName);
        // Resolver cancha
        const canchaName = (item.cancha || '').trim();
        const ubicacion = canchaName ? ubicaciones.find(u => u.nombre.toUpperCase() === canchaName.toUpperCase()) : null;
        let error: string | undefined;
        if (!localTeam) error = `Equipo "${item.local}" no encontrado`;
        else if (!visitanteTeam) error = `Equipo "${item.visitante}" no encontrado`;
        else if (localTeam.id === visitanteTeam.id) error = 'Un equipo no puede jugar contra sí mismo';
        else if (canchaName && !ubicacion) error = `Cancha "${item.cancha}" no encontrada`;
        return {
          local: item.local || '',
          visitante: item.visitante || '',
          fecha_hora: item.fecha_hora || '',
          equipo_local_id: localTeam?.id || 0,
          equipo_visitante_id: visitanteTeam?.id || 0,
          ubicacion_id: ubicacion?.id || 0,
          tipo: importTipo,
          error,
        };
      });
      setImportPreview(preview);
    } catch {
      setToast({ message: 'JSON inválido. Verifica el formato.', type: 'error' });
    }
  };

  const handleImportConfirm = async () => {
    if (!viewJornada || importPreview.length === 0) return;
    const hasErrors = importPreview.some(p => p.error);
    if (hasErrors) { setToast({ message: 'Corrige los errores antes de confirmar', type: 'error' }); return; }
    setSavingImport(true);
    try {
      await api.createPartidosBulk({
        jornada_id: viewJornada.id,
        partidos: importPreview.map(p => ({
          equipo_local_id: p.equipo_local_id,
          equipo_visitante_id: p.equipo_visitante_id,
          fecha_hora: p.fecha_hora || null,
          ubicacion_id: p.ubicacion_id || null,
          tipo: p.tipo || importTipo,
        })),
      });
      setToast({ message: `${importPreview.length} partidos creados correctamente`, type: 'success' });
      setImportModalOpen(false);
      setImportJson('');
      setImportPreview([]);
      await refreshPartidos();
    } catch (err: any) {
      setToast({ message: err.message || 'Error al importar partidos', type: 'error' });
    } finally {
      setSavingImport(false);
    }
  };

  // Resultados con IA
  const parseResultsJson = () => {
    try {
      const raw = JSON.parse(importResultsJson);
      if (!Array.isArray(raw)) { setToast({ message: 'El JSON debe ser un arreglo', type: 'error' }); return; }
      const preview = raw.map((item: any) => {
        const localName = (item.local || '').toUpperCase().trim();
        const visitanteName = (item.visitante || '').toUpperCase().trim();
        const localTeam = tournamentTeams.find(t => t.nombre.toUpperCase() === localName);
        const visitanteTeam = tournamentTeams.find(t => t.nombre.toUpperCase() === visitanteName);
        let error: string | undefined;
        if (!localTeam) error = `Equipo "${item.local}" no encontrado`;
        else if (!visitanteTeam) error = `Equipo "${item.visitante}" no encontrado`;
        else if (item.puntos_local === undefined || item.puntos_visitante === undefined) error = 'Faltan puntos';
        return {
          local: item.local || '',
          visitante: item.visitante || '',
          puntos_local: Number(item.puntos_local) || 0,
          puntos_visitante: Number(item.puntos_visitante) || 0,
          error,
        };
      });
      setImportResultsPreview(preview);
    } catch {
      setToast({ message: 'JSON inválido. Verifica el formato.', type: 'error' });
    }
  };

  const handleResultsConfirm = async () => {
    if (!viewJornada || importResultsPreview.length === 0) return;
    const hasErrors = importResultsPreview.some(p => p.error);
    if (hasErrors) { setToast({ message: 'Corrige los errores antes de confirmar', type: 'error' }); return; }
    setSavingResults(true);
    try {
      const res = await api.resultadosBulk({
        jornada_id: viewJornada.id,
        resultados: importResultsPreview.map(p => ({
          equipo_local: p.local,
          equipo_visitante: p.visitante,
          puntos_local: p.puntos_local,
          puntos_visitante: p.puntos_visitante,
        })),
      });
      const actualizados = (res as any)?.actualizados || importResultsPreview.length;
      const errores = (res as any)?.errores || [];
      if (errores.length > 0) {
        setToast({ message: `${actualizados} resultados guardados, ${errores.length} con error`, type: 'error' });
      } else {
        setToast({ message: `${actualizados} resultados guardados correctamente`, type: 'success' });
      }
      setImportResultsOpen(false);
      setImportResultsJson('');
      setImportResultsPreview([]);
      await refreshPartidos();
    } catch (err: any) {
      setToast({ message: err.message || 'Error al guardar resultados', type: 'error' });
    } finally {
      setSavingResults(false);
    }
  };

  const openAsistenciaManual = async (p: Partido) => {
    setAsistenciaPartido(p);
    setAsistenciaModalOpen(true);
    setLoadingAsistencia(true);
    try {
      const [jugLocal, jugVisitante, registradas] = await Promise.all([
        api.getJugadores(p.equipo_local_id),
        api.getJugadores(p.equipo_visitante_id),
        api.getAsistenciasPartido(p.id),
      ]);
      const localList = Array.isArray(jugLocal) ? jugLocal : [];
      const visitanteList = Array.isArray(jugVisitante) ? jugVisitante : [];
      const regList = Array.isArray(registradas) ? registradas : [];
      setAsistenciaJugadoresLocal(localList);
      setAsistenciaJugadoresVisitante(visitanteList);
      setAsistenciaRegistradas(regList);
      // Pre-seleccionar los que ya tienen asistencia
      setSelectedAsistLocal(new Set(regList.filter((r: any) => localList.some((j: any) => j.id === r.jugador_id)).map((r: any) => r.jugador_id)));
      setSelectedAsistVisitante(new Set(regList.filter((r: any) => visitanteList.some((j: any) => j.id === r.jugador_id)).map((r: any) => r.jugador_id)));
    } catch {
      setAsistenciaJugadoresLocal([]);
      setAsistenciaJugadoresVisitante([]);
      setAsistenciaRegistradas([]);
    } finally {
      setLoadingAsistencia(false);
    }
  };

  const handleSaveAsistenciaManual = async () => {
    if (!asistenciaPartido) return;
    setSavingAsistencia(true);
    try {
      // Nuevos a agregar (seleccionados que no estaban registrados)
      const localIds = [...selectedAsistLocal].filter(id => !asistenciaRegistradas.some((r: any) => r.jugador_id === id));
      const visitanteIds = [...selectedAsistVisitante].filter(id => !asistenciaRegistradas.some((r: any) => r.jugador_id === id));
      // A eliminar (estaban registrados pero ya no están seleccionados)
      const localToRemove = asistenciaRegistradas.filter((r: any) => asistenciaJugadoresLocal.some((j: any) => j.id === r.jugador_id) && !selectedAsistLocal.has(r.jugador_id)).map((r: any) => r.jugador_id);
      const visitanteToRemove = asistenciaRegistradas.filter((r: any) => asistenciaJugadoresVisitante.some((j: any) => j.id === r.jugador_id) && !selectedAsistVisitante.has(r.jugador_id)).map((r: any) => r.jugador_id);
      const toRemove = [...localToRemove, ...visitanteToRemove];

      if (localIds.length > 0) {
        await api.registrarAsistenciasManual({ partido_id: asistenciaPartido.id, equipo_id: asistenciaPartido.equipo_local_id, jugador_ids: localIds });
      }
      if (visitanteIds.length > 0) {
        await api.registrarAsistenciasManual({ partido_id: asistenciaPartido.id, equipo_id: asistenciaPartido.equipo_visitante_id, jugador_ids: visitanteIds });
      }
      if (toRemove.length > 0) {
        await api.eliminarAsistenciasManual({ partido_id: asistenciaPartido.id, jugador_ids: toRemove });
      }
      setToast({ message: 'Asistencias actualizadas correctamente', type: 'success' });
      setAsistenciaModalOpen(false);
    } catch (err: any) {
      setToast({ message: err.message || 'Error al actualizar asistencias', type: 'error' });
    } finally {
      setSavingAsistencia(false);
    }
  };

  const openShareJornada = async (j: Matchday) => {
    setSharingJornada(j);
    try {
      const data = await api.getPartidos(j.torneo_id, j.id);
      setSharePartidos(Array.isArray(data) ? data : []);
    } catch {
      setSharePartidos([]);
    }
    setShareModalOpen(true);
  };

  const handleDownloadImage = async () => {
    if (!flyerRef.current) return;
    try {
      // Convertir imágenes externas a base64 para captura
      const imgs = flyerRef.current.querySelectorAll('img');
      const originalSrcs: { img: HTMLImageElement; src: string }[] = [];
      await Promise.all(
        Array.from(imgs).map(async (img) => {
          const src = img.src;
          if (src && src.startsWith('http') && !src.startsWith(window.location.origin) && !src.startsWith('data:')) {
            try {
              // Agregar timestamp para evitar cache sin CORS
              const separator = src.includes('?') ? '&' : '?';
              const resp = await fetch(src + separator + '_t=' + Date.now(), { mode: 'cors' });
              if (!resp.ok) throw new Error('fetch failed');
              const blob = await resp.blob();
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              originalSrcs.push({ img, src });
              img.src = dataUrl;
            } catch (e) {
              console.warn('No se pudo convertir imagen:', src, e);
            }
          }
        })
      );
      // Esperar re-render
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(flyerRef.current, { backgroundColor: '#ffffff', scale: 3 });
      // Restaurar src originales
      originalSrcs.forEach(({ img, src }) => { img.src = src; });
      const link = document.createElement('a');
      link.download = `jornada-${sharingJornada?.numero || ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error al generar imagen', type: 'error' });
    }
  };

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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select style={{ fontSize: '0.8rem', padding: '0.4rem' }} defaultValue="" onChange={e => { if (e.target.value) { openHistorial(Number(e.target.value)); e.target.value = ''; } }}>
              <option value="" disabled>Historial equipo...</option>
              {tournamentTeams.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <button className="btn btn-secondary" onClick={openCombinaciones}>Asignar pendientes</button>
            <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> Nueva Jornada</button>
          </div>
        )}
      </div>

      {/* Filter + View Toggle */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <select value={selectedTournament} onChange={e => setSelectedTournament(e.target.value)}>
          <option value="">Seleccionar torneo...</option>
          {[...tournaments].sort((a, b) => a.id - b.id).map(t => <option key={t.id} value={String(t.id)}>{t.nombre}{t.periodo ? ` · ${t.periodo}` : ''}{t.categoria ? ` · ${t.categoria}` : ''}</option>)}
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
          {[...jornadas].sort((a, b) => b.id - a.id).map(j => (
            <div key={j.id} className="card">
              <h3 className="card-title">Jornada {j.numero}</h3>
              <div className="card-details">
                <p><strong>Fecha:</strong> {j.fecha ? formatDate(j.fecha) : '—'}</p>
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
              {[...jornadas].sort((a, b) => b.id - a.id).map(j => (
                <tr key={j.id}>
                  <td><strong>Jornada {j.numero}</strong></td>
                  <td>{j.fecha ? formatDate(j.fecha) : '—'}</td>
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
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary btn-sm" onClick={openCreatePartido}><Plus size={16} /> Agregar Partido</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setImportModalOpen(true); setImportJson(''); setImportPreview([]); }}>⚡ Crear rol con IA</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setImportResultsOpen(true); setImportResultsJson(''); setImportResultsPreview([]); }}>📊 Cargar resultados con IA</button>
                {partidos.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => viewJornada && openShareJornada(viewJornada)}><Share2 size={16} /> Compartir</button>
                )}
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
                      <th>Fecha/Hora</th>
                      <th>Tipo</th>
                      <th>Ubicación</th>
                      <th>Estatus</th>
                      <th title="Arbitraje pagado">💰</th>
                      <th>Obs.</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let lastUbicacionId: number | null | undefined = undefined;
                      return partidos.map(p => {
                        const showHeader = p.ubicacion_id !== lastUbicacionId;
                        lastUbicacionId = p.ubicacion_id;
                        return (
                          <React.Fragment key={p.id}>
                            {showHeader && (
                              <tr>
                                <td colSpan={12} style={{ background: 'var(--bg)', padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)' }}>
                                  📍 {p.ubicacion_id ? getUbicacionName(p.ubicacion_id) : 'Sin ubicación'}
                                </td>
                              </tr>
                            )}
                            <tr style={{ background: p.estatus === 'Jugado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }}>
                        <td><strong>{getTeamName(p.equipo_local_id)}</strong></td>
                        <td className="text-center">
                          {isHost ? (
                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={inlineScores[p.id]?.puntos_local ?? p.puntos_local} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setInlineScores(prev => ({ ...prev, [p.id]: { puntos_local: Number(val) || 0, puntos_visitante: prev[p.id]?.puntos_visitante ?? p.puntos_visitante } })); }} style={{ width: 40, textAlign: 'center', fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.2rem' }} />
                          ) : (
                            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{p.puntos_local}</span>
                          )}
                        </td>
                        <td className="text-center" style={{ color: 'var(--text-secondary)' }}>|</td>
                        <td className="text-center">
                          {isHost ? (
                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={inlineScores[p.id]?.puntos_visitante ?? p.puntos_visitante} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setInlineScores(prev => ({ ...prev, [p.id]: { puntos_local: prev[p.id]?.puntos_local ?? p.puntos_local, puntos_visitante: Number(val) || 0 } })); }} style={{ width: 40, textAlign: 'center', fontWeight: 700, color: '#8b5cf6', border: '1px solid var(--border)', borderRadius: 4, padding: '0.2rem' }} />
                          ) : (
                            <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{p.puntos_visitante}</span>
                          )}
                        </td>
                        <td><strong>{getTeamName(p.equipo_visitante_id)}</strong></td>
                        <td>{p.fecha_hora ? `${formatDate(p.fecha_hora)} ${new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}</td>
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
                            {(() => {
                              const s = inlineScores[p.id];
                              const changed = s && (s.puntos_local !== p.puntos_local || s.puntos_visitante !== p.puntos_visitante);
                              return changed ? (
                              <button className="btn btn-sm btn-primary" onClick={() => saveInlineScore(p.id)} disabled={savingInlineId === p.id} title="Guardar resultado" style={{ padding: '0.2rem 0.4rem' }}>
                                {savingInlineId === p.id ? '...' : <Save size={14} />}
                              </button>
                              ) : null;
                            })()}
                            <button className="btn btn-sm btn-ghost" onClick={async () => { setViewPartido(p); try { const d = await api.getSets(p.id); setViewPartidoSets(Array.isArray(d) ? d : []); } catch { setViewPartidoSets([]); } }} title="Ver"><Eye size={14} /></button>
                            {isHost && (
                              <>
                                <button className="btn btn-sm btn-ghost" onClick={() => openAsistenciaManual(p)} title="Asistencias"><UserCheck size={14} /></button>
                                <button className="btn btn-sm btn-ghost" onClick={() => openEditPartido(p)} title="Editar"><Edit size={14} /></button>
                                <button className="btn btn-sm btn-ghost text-danger" onClick={() => setDeletePartidoId(p.id)} title="Eliminar"><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create/Edit Partido Modal */}
      <Modal open={partidoModalOpen} onClose={() => { setPartidoModalOpen(false); if (editFromHistorial) { setEditFromHistorial(false); setHistorialModalOpen(true); } }} title={editingPartido ? 'Editar Partido' : 'Nuevo Partido'} wide>
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
            <label>Fecha y hora</label>
            <input type="datetime-local" value={partidoForm.fecha_hora} onChange={e => setPartidoForm({ ...partidoForm, fecha_hora: e.target.value })} />
          </div>
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
              <option value="">Seleccionar...</option>
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
                <input type="text" inputMode="numeric" value={partidoForm.puntos_local !== null ? partidoForm.puntos_local : ''} onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) { const val = e.target.value === '' ? 0 : Number(e.target.value); setPartidoForm(prev => ({ ...prev, puntos_local: val, estatus: (val > 0 || prev.puntos_visitante > 0) ? 'Jugado' : prev.estatus })); } }} />
              </div>
              <div className="form-group">
                <label style={{ color: '#8b5cf6', fontWeight: 700 }}>{getTeamName(editingPartido.equipo_visitante_id)} — Puntos</label>
                <input type="text" inputMode="numeric" value={partidoForm.puntos_visitante !== null ? partidoForm.puntos_visitante : ''} onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) { const val = e.target.value === '' ? 0 : Number(e.target.value); setPartidoForm(prev => ({ ...prev, puntos_visitante: val, estatus: (prev.puntos_local > 0 || val > 0) ? 'Jugado' : prev.estatus })); } }} />
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
        {editingPartido && localArbitrajes.length > 0 && (
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
                  {localArbitrajes.map(arb => (
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
          <button className="btn btn-secondary" onClick={() => { setPartidoModalOpen(false); if (editFromHistorial) { setEditFromHistorial(false); setHistorialModalOpen(true); } }}>Cancelar</button>
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

      {/* Share Jornada Modal */}
      <Modal open={shareModalOpen} onClose={() => setShareModalOpen(false)} title="Compartir Jornada" wide>
        <div ref={flyerRef} style={{ width: 600, background: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '1rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {(() => { const torneo = tournaments.find(t => t.id === torneoId); return torneo?.logo ? <img src={getFileUrl(torneo.logo) || '/logo-tornealo.png'} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} /> : <img src="/logo-tornealo.png" alt="Tornealo" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }} />; })()}
              <div>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.1, textTransform: 'uppercase' }}>Rol de Partidos</h1>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', margin: 0, marginTop: '0.2rem' }}>{tournaments.find(t => t.id === torneoId)?.nombre || 'Torneo de Voleibol'}</p>
                <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: 0, marginTop: '0.1rem' }}>
                  {tournaments.find(t => t.id === torneoId)?.categoria || ''}{tournaments.find(t => t.id === torneoId)?.periodo ? ` · ${tournaments.find(t => t.id === torneoId)?.periodo}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          {(() => {
            const direcciones = new Set(sharePartidos.map(p => {
              const u = p.ubicacion_id ? ubicaciones.find(ub => ub.id === p.ubicacion_id) : null;
              return u?.direccion || '';
            }).filter(Boolean));
            const mismaDireccion = direcciones.size <= 1;
            const direccionComun = mismaDireccion ? [...direcciones][0] || '—' : null;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: mismaDireccion ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '0.5rem', padding: '0.75rem 1.25rem', background: '#f8fafc' }}>
                {mismaDireccion && (
                  <div style={{ background: 'white', borderRadius: 6, padding: '0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>📌 Lugar</p>
                    <p style={{ fontSize: '0.65rem', fontWeight: 600, color: '#1e293b' }}>{direccionComun}</p>
                  </div>
                )}
                <div style={{ background: 'white', borderRadius: 6, padding: '0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>📅 Fecha</p>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e293b' }}>{sharingJornada?.fecha ? formatDate(sharingJornada.fecha) : '—'}</p>
                </div>
                <div style={{ background: 'white', borderRadius: 6, padding: '0.5rem', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.2rem' }}>🏐 Jornada</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>JORNADA {sharingJornada?.numero}</p>
                </div>
              </div>
            );
          })()}

          {/* Partidos agrupados por ubicación */}
          <div style={{ padding: '0.5rem 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(() => {
              const direcciones = new Set(sharePartidos.map(p => {
                const u = p.ubicacion_id ? ubicaciones.find(ub => ub.id === p.ubicacion_id) : null;
                return u?.direccion || '';
              }).filter(Boolean));
              const mismaDireccion = direcciones.size <= 1;
              const grouped = new Map<number | null, Partido[]>();
              sharePartidos.forEach(p => {
                const key = p.ubicacion_id;
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(p);
              });
              return [...grouped.entries()].map(([ubicId, partidos]) => {
                const ubic = ubicId ? ubicaciones.find(u => u.id === ubicId) : null;
                return (
                  <div key={ubicId ?? 'sin'} style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.7rem' }}>📍</span>
                        <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>{ubic?.nombre || 'Sin ubicación'}</h3>
                      </div>
                      {!mismaDireccion && ubic?.direccion && (
                        <p style={{ margin: 0, marginTop: '0.1rem', marginLeft: '1.3rem', fontSize: '0.55rem', color: '#94a3b8' }}>{ubic.direccion}</p>
                      )}
                    </div>
                    {/* Table Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '22px 55px 1fr 28px 1fr 55px', gap: '0.3rem', padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.05)', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>#</span>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Hora</span>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Local</span>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>vs</span>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Visitante</span>
                      <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Tipo</span>
                    </div>
                    {/* Rows */}
                    {partidos.map((p, i) => (
                      <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '22px 55px 1fr 28px 1fr 55px', gap: '0.3rem', padding: '0.4rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'center', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6' }}>{i + 1}</span>
                        <span style={{ fontSize: '0.6rem', color: '#e2e8f0' }}>{p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                          <img src={getFileUrl(localTeams.find(t => t.id === p.equipo_local_id)?.logo || '') || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(getTeamName(p.equipo_local_id)) + '&background=3b82f6&color=fff&size=20'} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'white' }}>{getTeamName(p.equipo_local_id)}</span>
                        </div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#f59e0b', textAlign: 'center' }}>VS</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                          <img src={getFileUrl(localTeams.find(t => t.id === p.equipo_visitante_id)?.logo || '') || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(getTeamName(p.equipo_visitante_id)) + '&background=8b5cf6&color=fff&size=20'} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'white' }}>{getTeamName(p.equipo_visitante_id)}</span>
                        </div>
                        <span style={{ fontSize: '0.5rem', fontWeight: 600, color: '#94a3b8', textAlign: 'center', textTransform: 'uppercase' }}>{p.tipo || '—'}</span>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1.25rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QRCodeCanvas value={`${window.location.origin}/torneo/${torneoId}`} size={36} level="M" />
              <div>
                <p style={{ fontSize: '0.55rem', color: '#64748b', margin: 0 }}>Detalles del torneo en</p>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, color: '#3b82f6', margin: 0, marginTop: '0.1rem' }}>{window.location.origin}/torneo/{torneoId}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <img src="/logo-tornealo.png" alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>TORNEALO</p>
                <p style={{ fontSize: '0.5rem', fontWeight: 700, color: '#3b82f6', margin: 0 }}>SPORTS</p>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShareModalOpen(false)}>Cerrar</button>
          <button className="btn btn-primary" onClick={handleDownloadImage}><Share2 size={16} /> Descargar imagen</button>
        </div>
      </Modal>

      {/* Asistencia Manual Modal */}
      <Modal open={asistenciaModalOpen} onClose={() => setAsistenciaModalOpen(false)} title="Registrar Asistencias" extraWide>
        {loadingAsistencia ? (
          <p>Cargando jugadores...</p>
        ) : asistenciaPartido && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Equipo Local */}
              <div>
                <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent)' }}>{getTeamName(asistenciaPartido.equipo_local_id)}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {asistenciaJugadoresLocal.map((j: any) => {
                    const yaRegistrado = asistenciaRegistradas.some((r: any) => r.jugador_id === j.id);
                    return (
                      <label key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', background: selectedAsistLocal.has(j.id) ? 'var(--success-light)' : 'var(--bg)', cursor: 'pointer', opacity: 1 }}>
                        <input type="checkbox" checked={selectedAsistLocal.has(j.id)}  onChange={() => {
                          setSelectedAsistLocal(prev => {
                            const next = new Set(prev);
                            if (next.has(j.id)) next.delete(j.id); else next.add(j.id);
                            return next;
                          });
                        }} />
                        <span style={{ fontSize: '0.85rem' }}>{j.nombre}{j.numero ? ` #${j.numero}` : ''}{yaRegistrado ? ' ✓' : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              {/* Equipo Visitante */}
              <div>
                <h4 style={{ marginBottom: '0.75rem', color: '#8b5cf6' }}>{getTeamName(asistenciaPartido.equipo_visitante_id)}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {asistenciaJugadoresVisitante.map((j: any) => {
                    const yaRegistrado = asistenciaRegistradas.some((r: any) => r.jugador_id === j.id);
                    return (
                      <label key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: 'var(--radius-sm)', background: selectedAsistVisitante.has(j.id) ? 'var(--success-light)' : 'var(--bg)', cursor: 'pointer', opacity: 1 }}>
                        <input type="checkbox" checked={selectedAsistVisitante.has(j.id)}  onChange={() => {
                          setSelectedAsistVisitante(prev => {
                            const next = new Set(prev);
                            if (next.has(j.id)) next.delete(j.id); else next.add(j.id);
                            return next;
                          });
                        }} />
                        <span style={{ fontSize: '0.85rem' }}>{j.nombre}{j.numero ? ` #${j.numero}` : ''}{yaRegistrado ? ' ✓' : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAsistenciaModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveAsistenciaManual} disabled={savingAsistencia}>
                {savingAsistencia ? 'Guardando...' : 'Registrar Asistencias'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Importar JSON Modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Importar Partidos desde JSON" extraWide>
        <div>
          {importPreview.length === 0 ? (
            <>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', borderRadius: 'var(--radius)', color: 'white' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>📋 Prompt para IA</p>
                <p style={{ fontSize: '0.7rem', marginBottom: '0.5rem', opacity: 0.9 }}>Copia este texto y pégalo en ChatGPT junto con la imagen del rol:</p>
                <div style={{ position: 'relative' }}>
                  <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.65rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 120, overflowY: 'auto', margin: 0 }}>
{`Con base en la siguiente imagen, regrésame un JSON con esta estructura:
[
  { "local": "EQUIPO1", "visitante": "EQUIPO2", "fecha_hora": "2026-07-05T18:00:00", "cancha": "Cancha 1" }
]
Mapea los nombres de equipos a esta lista oficial:
${tournamentTeams.map(t => t.nombre).join(', ')}
Mapea las canchas a esta lista oficial:
${ubicaciones.map(u => u.nombre).join(', ')}`}
                  </pre>
                  <button
                    style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', padding: '0.25rem 0.5rem', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.9)', color: '#3b82f6', fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer' }}
                    onClick={() => {
                      const prompt = `Con base en la siguiente imagen, regrésame un JSON con esta estructura:\n[\n  { "local": "EQUIPO1", "visitante": "EQUIPO2", "fecha_hora": "2026-07-05T18:00:00", "cancha": "Cancha 1" }\n]\nMapea los nombres de equipos a esta lista oficial:\n${tournamentTeams.map(t => t.nombre).join(', ')}\nMapea las canchas a esta lista oficial:\n${ubicaciones.map(u => u.nombre).join(', ')}`;
                      navigator.clipboard.writeText(prompt);
                      setToast({ message: 'Prompt copiado', type: 'success' });
                    }}
                  >Copiar</button>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Pega aquí el JSON que te devolvió la IA:
              </p>
              <textarea
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                placeholder="Pega tu JSON aquí..."
                style={{ width: '100%', minHeight: 150, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
              />
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setImportModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={parseImportJson} disabled={!importJson.trim()}>Procesar</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {importPreview.filter(p => !p.error).length} de {importPreview.length} partidos listos. Asigna tipo y cancha antes de confirmar.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Tipo (aplica a todos)</label>
                <select value={importTipo} onChange={e => { setImportTipo(e.target.value); setImportPreview(prev => prev.map(p => ({ ...p, tipo: e.target.value }))); }}>
                  <option value="Oficial">Oficial</option>
                  <option value="Amistoso">Amistoso</option>
                </select>
              </div>

              <div className="table-wrapper" style={{ maxHeight: 350, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Local</th>
                      <th>Visitante</th>
                      <th>Fecha/Hora</th>
                      <th>Cancha</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sorted = [...importPreview].map((p, origIdx) => ({ ...p, origIdx })).sort((a, b) => a.ubicacion_id - b.ubicacion_id);
                      let lastUbicacionId = -1;
                      return sorted.map((p, i) => {
                        const showHeader = p.ubicacion_id !== lastUbicacionId;
                        lastUbicacionId = p.ubicacion_id;
                        const ubicNombre = p.ubicacion_id ? ubicaciones.find(u => u.id === p.ubicacion_id)?.nombre || 'Sin asignar' : 'Sin asignar';
                        return (
                          <React.Fragment key={i}>
                            {showHeader && (
                              <tr>
                                <td colSpan={6} style={{ background: 'var(--bg)', padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '2px solid var(--border)' }}>
                                  📍 {ubicNombre}
                                </td>
                              </tr>
                            )}
                            <tr style={{ background: p.error ? 'rgba(239,68,68,0.08)' : undefined }}>
                              <td>{p.origIdx + 1}</td>
                              <td><strong>{p.local}</strong></td>
                              <td><strong>{p.visitante}</strong></td>
                              <td>{p.fecha_hora ? `${formatDate(p.fecha_hora)} ${new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}</td>
                              <td>
                                <select
                                  value={p.ubicacion_id}
                                  onChange={e => setImportPreview(prev => prev.map((item, idx) => idx === p.origIdx ? { ...item, ubicacion_id: Number(e.target.value) } : item))}
                                  style={{ fontSize: '0.8rem', padding: '0.3rem' }}
                                >
                                  <option value={0}>Sin asignar</option>
                                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                                </select>
                              </td>
                              <td>
                                {p.error ? (
                                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>⚠ {p.error}</span>
                                ) : (
                                  <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ OK</span>
                                )}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => { setImportPreview([]); }}>← Volver a editar</button>
                <button className="btn btn-secondary" onClick={() => setImportModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleImportConfirm} disabled={savingImport || importPreview.some(p => !!p.error)}>
                  {savingImport ? 'Creando...' : `Confirmar (${importPreview.filter(p => !p.error).length} partidos)`}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Importar Resultados con IA Modal */}
      <Modal open={importResultsOpen} onClose={() => setImportResultsOpen(false)} title="Cargar Resultados con IA" extraWide>
        <div>
          {importResultsPreview.length === 0 ? (
            <>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', borderRadius: 'var(--radius)', color: 'white' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>📊 Prompt para IA (Resultados)</p>
                <p style={{ fontSize: '0.7rem', marginBottom: '0.5rem', opacity: 0.9 }}>Copia este texto y pégalo en ChatGPT junto con la imagen de los resultados:</p>
                <div style={{ position: 'relative' }}>
                  <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.65rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 150, overflowY: 'auto', margin: 0 }}>
{`Con base en la siguiente imagen, regrésame un JSON con los resultados de los partidos de esta jornada.

Estos son los partidos programados (local vs visitante):
${partidos.map(p => `- ${getTeamName(p.equipo_local_id)} vs ${getTeamName(p.equipo_visitante_id)}`).join('\n')}

Regrésame el JSON con esta estructura exacta:
[
  { "local": "EQUIPO_LOCAL", "visitante": "EQUIPO_VISITANTE", "puntos_local": 3, "puntos_visitante": 0 }
]

Donde puntos_local y puntos_visitante son los puntos que obtiene cada equipo en ese partido.
Respeta exactamente los nombres de local y visitante como te los di arriba.`}
                  </pre>
                  <button
                    style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', padding: '0.25rem 0.5rem', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.9)', color: '#10b981', fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer' }}
                    onClick={() => {
                      const prompt = `Con base en la siguiente imagen, regrésame un JSON con los resultados de los partidos de esta jornada.\n\nEstos son los partidos programados (local vs visitante):\n${partidos.map(p => `- ${getTeamName(p.equipo_local_id)} vs ${getTeamName(p.equipo_visitante_id)}`).join('\n')}\n\nRegrésame el JSON con esta estructura exacta:\n[\n  { "local": "EQUIPO_LOCAL", "visitante": "EQUIPO_VISITANTE", "puntos_local": 3, "puntos_visitante": 0 }\n]\n\nDonde puntos_local y puntos_visitante son los puntos que obtiene cada equipo en ese partido.\nRespeta exactamente los nombres de local y visitante como te los di arriba.`;
                      navigator.clipboard.writeText(prompt);
                      setToast({ message: 'Prompt copiado', type: 'success' });
                    }}
                  >Copiar</button>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Pega aquí el JSON que te devolvió la IA:
              </p>
              <textarea
                value={importResultsJson}
                onChange={e => setImportResultsJson(e.target.value)}
                placeholder="Pega tu JSON aquí..."
                style={{ width: '100%', minHeight: 150, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
              />
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setImportResultsOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={parseResultsJson} disabled={!importResultsJson.trim()}>Procesar</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {importResultsPreview.filter(p => !p.error).length} de {importResultsPreview.length} resultados listos para guardar.
              </p>

              <div className="table-wrapper" style={{ maxHeight: 350, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Local</th>
                      <th>Pts</th>
                      <th></th>
                      <th>Pts</th>
                      <th>Visitante</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResultsPreview.map((p, i) => (
                      <tr key={i} style={{ background: p.error ? 'rgba(239,68,68,0.08)' : undefined }}>
                        <td>{i + 1}</td>
                        <td><strong>{p.local}</strong></td>
                        <td style={{ fontWeight: 700, color: p.puntos_local > p.puntos_visitante ? 'var(--success)' : 'var(--text-secondary)' }}>{p.puntos_local}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>vs</td>
                        <td style={{ fontWeight: 700, color: p.puntos_visitante > p.puntos_local ? 'var(--success)' : 'var(--text-secondary)' }}>{p.puntos_visitante}</td>
                        <td><strong>{p.visitante}</strong></td>
                        <td>
                          {p.error ? (
                            <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>⚠ {p.error}</span>
                          ) : (
                            <span style={{ color: 'var(--success)', fontSize: '0.75rem' }}>✓ OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => { setImportResultsPreview([]); }}>← Volver a editar</button>
                <button className="btn btn-secondary" onClick={() => setImportResultsOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleResultsConfirm} disabled={savingResults || importResultsPreview.some(p => !!p.error)}>
                  {savingResults ? 'Guardando...' : `Confirmar (${importResultsPreview.filter(p => !p.error).length} resultados)`}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Historial de Equipo Modal */}
      <Modal open={historialModalOpen} onClose={() => setHistorialModalOpen(false)} title={`Historial — ${getTeamName(historialEquipoId)}`} extraWide>
        {loadingHistorial ? (
          <p>Cargando partidos...</p>
        ) : historialPartidos.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No hay partidos registrados para este equipo.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Jornada</th>
                  <th>Local</th>
                  <th>Pts</th>
                  <th></th>
                  <th>Pts</th>
                  <th>Visitante</th>
                  <th>Fecha/Hora</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historialPartidos.map(p => (
                  <tr key={p.id} style={{ background: p.estatus === 'Jugado' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)' }}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>J{(p as any).jornada_numero || '—'}</td>
                    <td><strong>{getTeamName(p.equipo_local_id)}</strong></td>
                    <td className="text-center" style={{ fontWeight: 700, color: 'var(--accent)' }}>{p.puntos_local}</td>
                    <td className="text-center" style={{ color: 'var(--text-secondary)' }}>|</td>
                    <td className="text-center" style={{ fontWeight: 700, color: '#8b5cf6' }}>{p.puntos_visitante}</td>
                    <td><strong>{getTeamName(p.equipo_visitante_id)}</strong></td>
                    <td style={{ fontSize: '0.8rem' }}>{p.fecha_hora ? `${formatDate(p.fecha_hora)} ${new Date(p.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}</td>
                    <td><span className={`badge badge-${p.estatus === 'Jugado' ? 'active' : 'warning'}`}>{p.estatus || '—'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => { setEditFromHistorial(true); setHistorialModalOpen(false); openEditPartido(p); }} title="Editar"><Edit size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} message="¿Eliminar esta jornada?" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      <ConfirmDialog open={!!deletePartidoId} message="¿Eliminar este partido?" onConfirm={handleDeletePartido} onCancel={() => setDeletePartidoId(null)} />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
