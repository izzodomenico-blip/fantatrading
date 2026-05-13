import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ScaleAnalysis from './pages/ScaleAnalysis';
import RuleComparison from './pages/RuleComparison';
import SensitivityPage from './pages/SensitivityPage';
import PriceModelPage from './pages/PriceModelPage';
import FullRulesV1 from './pages/FullRulesV1';
import ParticipantFavc from './pages/ParticipantFavc';

const NAV = [
  { path: '/', label: 'Dashboard', icon: '⬛', end: true },
  { path: '/scala', label: 'Analisi per Scala', icon: '📈', end: false },
  { path: '/modelli', label: 'Modelli Regolamento', icon: '⚖️', end: false },
  { path: '/sensibilita', label: 'Sensibilità', icon: '🎛️', end: false },
  { path: '/prezzi', label: 'Modello Prezzi', icon: '💹', end: false },
  { path: '/full-rules-v1', label: 'Full Rules V1', icon: 'V1', end: false },
  { path: '/partecipante-favc', label: 'Partecipante FAVC', icon: 'F', end: false },
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">FantaTrading</div>
          <div className="sidebar-sub">Motore Analitico v0.1</div>
        </div>
        <nav className="nav">
          {NAV.map(({ path, label, icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          199 test verdi · Fasi 1–4
        </div>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scala" element={<ScaleAnalysis />} />
          <Route path="/modelli" element={<RuleComparison />} />
          <Route path="/sensibilita" element={<SensitivityPage />} />
          <Route path="/prezzi" element={<PriceModelPage />} />
          <Route path="/full-rules-v1" element={<FullRulesV1 />} />
          <Route path="/partecipante-favc" element={<ParticipantFavc />} />
        </Routes>
      </main>
    </div>
  );
}
