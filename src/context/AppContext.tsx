import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Role, Tournament, Team, Player, Referee,
  Match, SetResult, Attendance
} from '@/types';
import { api } from '@/services/api';

interface AppState {
  role: Role;
  referees: Referee[];
  matches: Match[];
  setResults: SetResult[];
  attendances: Attendance[];
}

interface AppContextType extends AppState {
  tournaments: Tournament[];
  teams: Team[];
  players: Player[];
  matchdays: any[];
  refreshTournaments: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  setRole: (r: Role) => void;
  // Referee
  addReferee: (r: Omit<Referee, 'id'>) => void;
  updateReferee: (id: string, r: Partial<Referee>) => void;
  deleteReferee: (id: string) => void;
  // Match (legacy - for Results/Standings pages)
  addMatch: (m: Omit<Match, 'id'>) => void;
  updateMatch: (id: string, m: Partial<Match>) => void;
  deleteMatch: (id: string) => void;
  // SetResult
  addSetResult: (s: Omit<SetResult, 'id'>) => void;
  updateSetResult: (id: string, s: Partial<SetResult>) => void;
  // Attendance
  setAttendance: (matchId: string, playerId: string, present: boolean) => void;
  getAttendance: (matchId: string) => Attendance[];
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = 'voleibol_app_data';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw), role: 'anfitrion' as const };
  } catch { /* ignore */ }
  return defaultState();
}

function defaultState(): AppState {
  return {
    role: 'anfitrion',
    referees: [],
    matches: [],
    setResults: [],
    attendances: [],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const persist = useCallback((next: AppState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const refreshTournaments = useCallback(async () => {
    try {
      const data = await api.getTournaments();
      setTournaments(data);
    } catch (err) {
      console.error('Error loading tournaments:', err);
    }
  }, []);

  const refreshTeams = useCallback(async () => {
    try {
      const data = await api.getEquipos();
      setTeams(data);
    } catch (err) {
      console.error('Error loading teams:', err);
    }
  }, []);

  useEffect(() => {
    refreshTournaments();
    refreshTeams();
  }, [refreshTournaments, refreshTeams]);

  const setRole = (role: Role) => persist({ ...state, role });

  // Referee CRUD
  const addReferee = (r: Omit<Referee, 'id'>) => {
    persist({ ...state, referees: [...state.referees, { ...r, id: uuidv4() }] });
  };
  const updateReferee = (id: string, r: Partial<Referee>) => {
    persist({ ...state, referees: state.referees.map(x => x.id === id ? { ...x, ...r } : x) });
  };
  const deleteReferee = (id: string) => {
    persist({ ...state, referees: state.referees.filter(x => x.id !== id) });
  };

  // Match CRUD (legacy)
  const addMatch = (m: Omit<Match, 'id'>) => {
    persist({ ...state, matches: [...state.matches, { ...m, id: uuidv4() }] });
  };
  const updateMatch = (id: string, m: Partial<Match>) => {
    persist({ ...state, matches: state.matches.map(x => x.id === id ? { ...x, ...m } : x) });
  };
  const deleteMatch = (id: string) => {
    persist({ ...state, matches: state.matches.filter(x => x.id !== id) });
  };

  // SetResult
  const addSetResult = (s: Omit<SetResult, 'id'>) => {
    persist({ ...state, setResults: [...state.setResults, { ...s, id: uuidv4() }] });
  };
  const updateSetResult = (id: string, s: Partial<SetResult>) => {
    persist({ ...state, setResults: state.setResults.map(x => x.id === id ? { ...x, ...s } : x) });
  };

  // Attendance
  const setAttendance = (matchId: string, playerId: string, present: boolean) => {
    const existing = state.attendances.find(a => a.matchId === matchId && a.playerId === playerId);
    if (existing) {
      persist({ ...state, attendances: state.attendances.map(a => a.id === existing.id ? { ...a, present } : a) });
    } else {
      persist({ ...state, attendances: [...state.attendances, { id: uuidv4(), matchId, playerId, present }] });
    }
  };
  const getAttendance = (matchId: string) => state.attendances.filter(a => a.matchId === matchId);

  const value: AppContextType = {
    ...state, tournaments, teams, players: [], matchdays: [], refreshTournaments, refreshTeams, setRole,
    addReferee, updateReferee, deleteReferee,
    addMatch, updateMatch, deleteMatch,
    addSetResult, updateSetResult,
    setAttendance, getAttendance,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
