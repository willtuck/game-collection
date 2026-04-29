import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/landing/LandingPage';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/landing/AuthGuard';
import { useAuthInit } from './hooks/useAuthInit';

function AppRoutes() {
  useAuthInit();
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AuthGuard><AppShell /></AuthGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
