import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import ChangePassword from '@/pages/ChangePassword';
import Tournaments from '@/pages/Tournaments';
import Teams from '@/pages/Teams';
import Matchdays from '@/pages/Matchdays';
import Referees from '@/pages/Referees';
import Results from '@/pages/Results';
import Standings from '@/pages/Standings';
import Attendance from '@/pages/Attendance';
import MyInfo from '@/pages/MyInfo';
import TorneoPublico from '@/pages/TorneoPublico';

function DefaultRedirect() {
  const { usuario } = useAuth();
  const savedRole = localStorage.getItem('voleibol_active_role');
  const activeRole = savedRole && usuario?.roles?.includes(savedRole) ? savedRole : usuario?.roles?.[0];
  if (activeRole === 'jugador') return <Navigate to="/my-info" replace />;
  return <Navigate to="/tournaments" replace />;
}

function ProtectedRoutes() {
  const { isAuthenticated, usuario } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.requiere_cambio_password) return <Navigate to="/cambiar-password" replace />;
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/matchdays" element={<Matchdays />} />
          <Route path="/referees" element={<Referees />} />
          <Route path="/results" element={<Results />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/my-info" element={<MyInfo />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cambiar-password" element={<ChangePassword />} />
          <Route path="/torneo/:id" element={<TorneoPublico />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
