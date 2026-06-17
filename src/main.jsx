import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { initializeFBInstant, isFBInstant } from './services/fbinstant'

// Error Boundary for the root to prevent total blank screens
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("Root Crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#020617', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
          <div>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
            <p style={{ opacity: 0.6 }}>The stars are temporarily obscured. Please refresh the page.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const initAndRender = () => {
  // Start initialization but DON'T await it - let React mount immediately
  if (isFBInstant()) {
    initializeFBInstant().catch(err => console.warn("FB Init Error:", err));
  }

  const container = document.getElementById('root');
  const root = createRoot(container);

  root.render(
    <StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <App />
        </HashRouter>
      </ErrorBoundary>
    </StrictMode>
  );
};

initAndRender();
