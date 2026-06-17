import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { initializeFBInstant, isFBInstant } from './services/fbinstant'

const initAndRender = async () => {
  // If running in FB Instant Games environment, initialize first
  if (isFBInstant()) {
    await initializeFBInstant();
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
};

initAndRender();
