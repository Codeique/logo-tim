import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import axios from 'axios';
import getTheme from './theme';
import useAuthStore from './store/authStore';
import { useSocket } from './hooks/useSocket';

import Layout from './components/Layout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import PatientsPage from './pages/Patients';
import PatientDetailPage from './pages/PatientDetail';
import TherapistsPage from './pages/Therapists';
import RoomsPage from './pages/Rooms';
import CalendarPage from './pages/Calendar';
import FinancePage from './pages/Finance';
import TransactionsPage from './pages/Transactions';

const ProtectedRoute = ({ children, roles }) => {
  const { user, accessToken } = useAuthStore();
  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const [initializing, setInitializing] = useState(true);
  const theme = useMemo(() => getTheme(mode), [mode]);
  // Prevents React 18 StrictMode from double-firing the init effect (which would
  // rotate the refresh token on the first call then fail the second with 401 → logout).
  const didInit = useRef(false);
  useSocket();

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    const { user, accessToken, setAuth, logout } = useAuthStore.getState();

    // Already have a live access token in memory (e.g. HMR without full page reload).
    if (accessToken) { setInitializing(false); return; }

    // No persisted user means not logged in — skip the network call entirely.
    if (!user) { setInitializing(false); return; }

    // Persisted user exists but access token is gone (hard refresh / browser reopen).
    // Call the refresh endpoint to get a fresh access token from the HttpOnly cookie.
    axios.post('/api/auth/refresh', {}, { withCredentials: true })
      .then(({ data }) => setAuth(data.user, data.accessToken))
      .catch(() => logout()) // Cookie expired / invalid → clear persisted user, go to login
      .finally(() => setInitializing(false));
  }, []);

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    localStorage.setItem('themeMode', next);
  };

  if (initializing) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout onToggleTheme={toggleMode} mode={mode} />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="therapists" element={<ProtectedRoute roles={['ADMIN']}><TherapistsPage /></ProtectedRoute>} />
          <Route path="rooms" element={<ProtectedRoute roles={['ADMIN']}><RoomsPage /></ProtectedRoute>} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="finance" element={<ProtectedRoute roles={['ADMIN','THERAPIST']}><FinancePage /></ProtectedRoute>} />
          <Route path="transactions" element={<ProtectedRoute roles={['ADMIN']}><TransactionsPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
