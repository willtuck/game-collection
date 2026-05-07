import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { LandingPage } from './components/landing/LandingPage';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/landing/AuthGuard';
import { PrivacyPage } from './components/legal/PrivacyPage';
import { TermsPage } from './components/legal/TermsPage';
import { AuthModal } from './components/auth/AuthModal';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { useAuthInit } from './hooks/useAuthInit';

function AppRoutes() {
  useAuthInit();
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<AuthGuard><AppShell /></AuthGuard>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthModal />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Analytics />
    </BrowserRouter>
  );
}
