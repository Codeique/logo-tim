import React, { useState, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
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
  const theme = useMemo(() => getTheme(mode), [mode]);
  useSocket();

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    localStorage.setItem('themeMode', next);
  };

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
          <Route path="transactions" element={<TransactionsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
