import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ui/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Dashboard } from './pages/dashboard/Dashboard';
import { InterviewSetup } from './pages/interview/InterviewSetup';

const NotFound = () => (
  <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Not Found</h1>
    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>The page you are looking for does not exist.</p>
    <a href="/" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--accent-color)', color: 'white', borderRadius: 'var(--radius-md)' }}>
      Return Home
    </a>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicRoute />}>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
          </Route>

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/interview/setup" element={<InterviewSetup />} />
              {/* Future protected routes will go here */}
            </Route>
          </Route>

          {/* Redirect Root */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
