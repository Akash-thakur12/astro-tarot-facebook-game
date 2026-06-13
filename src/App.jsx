import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Tarot from './pages/Tarot';
import Kundali from './pages/Kundali';
import Premium from './pages/Premium';
import AskPandit from './pages/AskPandit';
import FortuneWheel from './pages/FortuneWheel';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/tarot" element={<Tarot />} />
              <Route path="/kundali" element={<Kundali />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/ask-pandit" element={<AskPandit />} />
              <Route path="/fortune-wheel" element={<FortuneWheel />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
