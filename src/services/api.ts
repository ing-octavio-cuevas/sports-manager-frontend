const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function getFileUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const normalized = path.replace(/\\\\/g, '/').replace(/\\/g, '/');
  return `${BASE_URL}/${normalized}`;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('voleibol_token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function authOnly(): Record<string, string> {
  const token = localStorage.getItem('voleibol_token');
  const h: Record<string, string> = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function handleUnauthorized() {
  localStorage.removeItem('voleibol_token');
  localStorage.removeItem('voleibol_usuario');
  window.location.href = '/login';
}

async function get(url: string) {
  const res = await fetch(url, { headers: authOnly() });
  if (res.status === 401) { handleUnauthorized(); throw new Error('Sesión expirada'); }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

async function post(url: string, data: unknown) {
  const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
  if (res.status === 401) { handleUnauthorized(); throw new Error('Sesión expirada'); }
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || `Error ${res.status}`);
  }
  return res.json();
}

async function put(url: string, data: unknown) {
  const res = await fetch(url, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) });
  if (res.status === 401) { handleUnauthorized(); throw new Error('Sesión expirada'); }
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

async function del(url: string) {
  const res = await fetch(url, { method: 'DELETE', headers: authOnly() });
  if (res.status === 401) { handleUnauthorized(); throw new Error('Sesión expirada'); }
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || `Error ${res.status}`);
  }
}

export const api = {
  // Torneos
  getTournaments: () => get(`${BASE_URL}/torneos/`),
  getTournament: (id: number) => get(`${BASE_URL}/torneos/${id}`),
  createTournament: (data: any) => post(`${BASE_URL}/torneos/`, data),
  updateTournament: (id: number, data: any) => put(`${BASE_URL}/torneos/${id}`, { id, ...data }),
  async deleteTournament(id: number) { await del(`${BASE_URL}/torneos/${id}`); },
  async uploadTorneoLogo(torneoId: number, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    const token = localStorage.getItem('voleibol_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/torneos/${torneoId}/logo`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Error al subir logo');
    return res.json();
  },
  async uploadTorneoReglamento(torneoId: number, file: File) {
    const formData = new FormData();
    formData.append('reglamento', file);
    const token = localStorage.getItem('voleibol_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/torneos/${torneoId}/reglamento`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Error al subir reglamento');
    return res.json();
  },

  // Ubicaciones
  getUbicaciones: (torneoId: number) => get(`${BASE_URL}/torneos/${torneoId}/ubicaciones`),
  createUbicacion: (torneoId: number, data: any) => post(`${BASE_URL}/torneos/${torneoId}/ubicaciones`, { torneo_id: torneoId, ...data }),
  updateUbicacion: (torneoId: number, ubicacionId: number, data: any) => put(`${BASE_URL}/torneos/${torneoId}/ubicaciones/${ubicacionId}`, data),
  async deleteUbicacion(torneoId: number, ubicacionId: number) { await del(`${BASE_URL}/torneos/${torneoId}/ubicaciones/${ubicacionId}`); },

  // Equipos
  getEquipos: (params?: { anfitrion_id?: number; torneo_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.anfitrion_id) query.append('anfitrion_id', String(params.anfitrion_id));
    if (params?.torneo_id) query.append('torneo_id', String(params.torneo_id));
    const qs = query.toString();
    return get(`${BASE_URL}/equipos/${qs ? '?' + qs : ''}`);
  },
  getEquipo: (id: number) => get(`${BASE_URL}/equipos/${id}`),
  createEquipo: (data: any) => post(`${BASE_URL}/equipos/`, data),
  updateEquipo: (id: number, data: any) => put(`${BASE_URL}/equipos/${id}`, data),
  async deleteEquipo(id: number) { await del(`${BASE_URL}/equipos/${id}`); },
  async uploadEquipoLogo(equipoId: number, file: File) {
    const formData = new FormData();
    formData.append('logo', file);
    const token = localStorage.getItem('voleibol_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/equipos/${equipoId}/logo`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Error al subir logo');
    return res.json();
  },

  // Jugadores
  getJugadores: (equipoId: number, torneoId?: number) => get(`${BASE_URL}/jugadores?equipo_id=${equipoId}${torneoId ? `&torneo_id=${torneoId}` : ''}`),
  createJugador: (data: any) => post(`${BASE_URL}/jugadores/`, data),
  updateJugador: (id: number, data: any) => put(`${BASE_URL}/jugadores/${id}`, data),
  async deleteJugador(id: number) { await del(`${BASE_URL}/jugadores/${id}`); },
  async uploadFotoJugador(jugadorId: number, file: File) {
    // Comprimir y convertir imagen antes de subir
    const { compressImage } = await import('@/utils/imageUtils');
    let processedFile = file;
    try {
      processedFile = await compressImage(file, 800, 0.8);
    } catch (err) {
      console.warn('No se pudo comprimir la imagen, subiendo original:', err);
    }
    const formData = new FormData();
    formData.append('foto', processedFile);
    const token = localStorage.getItem('voleibol_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/jugadores/${jugadorId}/foto`, { method: 'POST', headers, body: formData });
    if (!res.ok) throw new Error('Error al subir foto');
    return res.json();
  },

  // Jornadas
  getJornadas: (torneoId: number) => get(`${BASE_URL}/jornadas?torneo_id=${torneoId}`),
  getJornada: (id: number) => get(`${BASE_URL}/jornadas/${id}`),
  createJornada: (data: any) => post(`${BASE_URL}/jornadas/`, data),
  updateJornada: (id: number, data: any) => put(`${BASE_URL}/jornadas/${id}`, data),
  async deleteJornada(id: number) { await del(`${BASE_URL}/jornadas/${id}`); },

  // Partidos
  getPartidos: (torneoId: number, jornadaId: number) => get(`${BASE_URL}/partidos?torneo_id=${torneoId}&jornada_id=${jornadaId}`),
  createPartido: (data: any) => post(`${BASE_URL}/partidos/`, data),
  updatePartido: (id: number, data: any) => put(`${BASE_URL}/partidos/${id}`, data),
  async deletePartido(id: number) { await del(`${BASE_URL}/partidos/${id}`); },

  // Sets
  getSets: (partidoId: number) => get(`${BASE_URL}/partidos/${partidoId}/sets`),
  createSet: (partidoId: number, data: any) => post(`${BASE_URL}/partidos/${partidoId}/sets`, data),
  updateSet: (partidoId: number, setId: number, data: any) => put(`${BASE_URL}/partidos/${partidoId}/sets/${setId}`, data),
  async deleteSet(partidoId: number, setId: number) { await del(`${BASE_URL}/partidos/${partidoId}/sets/${setId}`); },

  // Combinaciones y tabla
  getCombinacionesPendientes: (torneoId: number, vueltas: number) => get(`${BASE_URL}/partidos/torneo/${torneoId}/combinaciones-pendientes?vueltas=${vueltas}`),
  getTablaPosiciones: (torneoId: number) => get(`${BASE_URL}/partidos/torneo/${torneoId}/tabla-posiciones`),

  // Arbitrajes
  getArbitrajes: (partidoId: number) => get(`${BASE_URL}/partido-arbitraje/?partido_id=${partidoId}`),
  updateArbitraje: (id: number, data: any) => put(`${BASE_URL}/partido-arbitraje/${id}`, data),

  // Asistencias
  getPartidosCapitan: (capitanId: number, filtro?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (filtro) params.append('filtro', filtro);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const qs = params.toString();
    return get(`${BASE_URL}/asistencias/capitan/${capitanId}/partidos${qs ? '?' + qs : ''}`);
  },
  getAsistenciasPartido: (partidoId: number) => get(`${BASE_URL}/asistencias/partido/${partidoId}`),
  getEstadoAsistencia: (partidoId: number) => get(`${BASE_URL}/asistencias/partido/${partidoId}/estado`),
  registrarAsistencias: (data: { partido_id: number; jugador_ids: number[]; registrado_por: number }) => post(`${BASE_URL}/asistencias`, data),
  registrarAsistenciasManual: (data: { partido_id: number; equipo_id: number; jugador_ids: number[] }) => post(`${BASE_URL}/asistencias/manual`, data),
  async eliminarAsistenciasManual(data: { partido_id: number; jugador_ids: number[] }) {
    const res = await fetch(`${BASE_URL}/asistencias/manual`, { method: 'DELETE', headers: authHeaders(), body: JSON.stringify(data) });
    if (res.status === 401) { handleUnauthorized(); throw new Error('Sesión expirada'); }
    if (!res.ok && res.status !== 204) { const err = await res.json().catch(() => null); throw new Error(err?.detail || `Error ${res.status}`); }
  },
  getResumenAsistencia: (equipoId: number, torneoId: number) => get(`${BASE_URL}/asistencias/equipo/${equipoId}/resumen?torneo_id=${torneoId}`),

  // Jugador - Mi información
  getMiInformacion: () => get(`${BASE_URL}/jugadores/mi-informacion`),
  getMiInformacionPartidos: (torneoId: number, page: number, limit: number, buscar?: string) => get(`${BASE_URL}/jugadores/mi-informacion/partidos?torneo_id=${torneoId}&page=${page}&limit=${limit}${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ''}`),
  getMiCapitan: () => get(`${BASE_URL}/jugadores/mi-capitan`),

  // Usuarios
  createUsuario: (data: { celular: string; password: string; nombre: string; roles: string[]; jugador_id: number }) => post(`${BASE_URL}/usuarios`, data),
  recuperarPassword: (data: { celular?: string; email?: string }) => post(`${BASE_URL}/auth/recuperar-password`, data),
  verificarCodigoReset: (data: { celular: string; codigo: string; new_password: string }) => post(`${BASE_URL}/auth/verificar-codigo-reset`, data),
  async cambiarPassword(newPassword: string) {
    const res = await fetch(`${BASE_URL}/auth/cambiar-password`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ new_password: newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || 'Error al cambiar contraseña');
    }
    return res.json();
  },
};
