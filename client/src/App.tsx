import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Chatbot from './components/features/Chatbot';
import TransactionScreener from './components/features/TransactionScreener';
import Dashboard from './pages/Dashboard';
import Protection from './pages/Protection';
import Threats from './pages/Threats';
import Settings from './pages/Settings';
import LoadingScreen from './components/ui/LoadingScreen';
import './styles/globals.css';

function App() {
  return (
    <>
      <LoadingScreen />
      <Router>
        <div className="min-h-screen bg-gray-950 flex flex-col">
          <Header />
          
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/protection" element={<Protection />} />
              <Route path="/threats" element={<Threats />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
          
          <Chatbot />
          <TransactionScreener />
        </div>
      </Router>
    </>
  );
}

export default App;