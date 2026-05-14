export type Role = 'anfitrion' | 'arbitro' | 'jugador';

export interface Ubicacion {
  id: number;
  torneo_id: number;
  nombre: string;
  direccion: string;
  ubicacion: string;
}

export interface Anfitrion {
  id: number;
  nombre_completo: string;
  estatus: boolean;
}

export interface Tournament {
  id: number;
  nombre: string;
  reglamento: string;
  logo: string;
  fecha_creacion?: string;
  publicado: boolean;
  periodo: string;
  categoria: string;
  numero_vueltas: number;
  anfitrion_id: number;
  anfitrion?: Anfitrion;
  ubicaciones: Ubicacion[];
}

export interface TournamentCreate {
  nombre: string;
  reglamento: string;
  logo: string;
  publicado: boolean;
  periodo: string;
  categoria: string;
  anfitrion_id: number;
}

export interface UbicacionCreate {
  nombre: string;
  ubicacion: string;
}

export interface Team {
  id: number;
  torneo_id: number;
  nombre: string;
  logo: string;
  fecha_creacion: string;
  estatus: boolean;
  inscripcion_pagada: boolean;
  monto_pagado: number | null;
  fecha_pago_inscripcion: string | null;
}

export interface TeamCreate {
  torneo_id: number;
  nombre: string;
  logo: string;
  fecha_creacion: string;
  estatus: boolean;
  inscripcion_pagada: boolean;
  monto_pagado: number | null;
  fecha_pago_inscripcion: string | null;
}

export interface Player {
  id: number;
  equipo_id: number;
  nombre: string;
  numero: number;
  posicion: string;
  estatus: boolean;
  es_capitan: boolean;
  fecha_creacion: string;
  foto: string | null;
  curp: string | null;
  codigo_qr: string;
  usuario_id: number | null;
  email: string | null;
}

export interface PlayerCreate {
  equipo_id: number;
  nombre: string;
  numero: number;
  posicion: string;
  estatus: boolean;
  es_capitan: boolean;
  fecha_creacion: string;
  foto: string | null;
  curp: string | null;
  codigo_qr: string;
}

export interface Referee {
  id: string;
  fullName: string;
  status: 'active' | 'inactive';
}

export interface Matchday {
  id: number;
  torneo_id: number;
  numero: number;
  fecha: string;
  estatus: boolean;
}

export interface Partido {
  id: number;
  torneo_id: number;
  jornada_id: number;
  equipo_local_id: number;
  equipo_visitante_id: number;
  puntos_local: number;
  puntos_visitante: number;
  ubicacion_id: number | null;
  estatus: string | null;
  tipo: string | null;
  observaciones: string | null;
}

export interface PartidoSet {
  id: number;
  partido_id: number;
  numero_set: number;
  marcador_local: number;
  marcador_visitante: number;
}

export interface PartidoArbitraje {
  id: number;
  partido_id: number;
  equipo_id: number;
  pagado: boolean;
  monto: number | null;
  fecha_pago: string | null;
  observaciones: string | null;
}

export interface CombinacionPendiente {
  equipo_local_id: number;
  equipo_local_nombre: string;
  equipo_visitante_id: number;
  equipo_visitante_nombre: string;
}

export interface Match {
  id: string;
  matchdayId: string;
  tournamentId: string;
  team1Id: string;
  team2Id: string;
  courtId: string;
  schedule: string;
  refereeId: string;
  setsToPlay: number;
  team1RefereePaid: boolean;
  team2RefereePaid: boolean;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface SetResult {
  id: string;
  matchId: string;
  setNumber: number;
  team1Score: number;
  team2Score: number;
}

export interface Attendance {
  id: string;
  matchId: string;
  playerId: string;
  present: boolean;
}

export interface StandingsRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  setsWon: number;
  setsLost: number;
  pointsFor: number;
  pointsAgainst: number;
  points: number;
}
