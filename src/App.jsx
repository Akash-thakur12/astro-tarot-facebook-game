import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Tarot from './pages/Tarot';
import Kundali from './pages/Kundali';
import Premium from './pages/Premium';
import AskPandit from './pages/AskPandit';
import FortuneWheel from './pages/FortuneWheel';
import Privacy from './pages/Privacy';
import DataDeletion from './pages/DataDeletion';
import Terms from './pages/Terms';
import Login from './pages/Login';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/data-deletion" element={<DataDeletion />} />
            <Route path="/terms" element={<Terms />} />

            {/* Protected Routes (Allow Guests by default) */}
            <Route path="/" element={
              <ProtectedRoute allowAnonymous={true}>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/tarot" element={
              <ProtectedRoute allowAnonymous={true}>
                <Tarot />
              </ProtectedRoute>
            } />
            <Route path="/kundali" element={
              <ProtectedRoute allowAnonymous={true}>
                <Kundali />
              </ProtectedRoute>
            } />
            <Route path="/premium" element={
              <ProtectedRoute allowAnonymous={true}>
                <Premium />
              </ProtectedRoute>
            } />
            <Route path="/ask-pandit" element={
              <ProtectedRoute allowAnonymous={true}>
                <AskPandit />
              </ProtectedRoute>
            } />
            <Route path="/fortune-wheel" element={
              <ProtectedRoute allowAnonymous={true}>
                <FortuneWheel />
              </ProtectedRoute>
            } />

            {/* Catch-all: Redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
