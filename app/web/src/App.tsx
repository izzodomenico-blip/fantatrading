import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FullRulesV1 from './pages/FullRulesV1';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import ParticipantFavc from './pages/ParticipantFavc';
import PriceModelPage from './pages/PriceModelPage';
import RuleComparison from './pages/RuleComparison';
import ScaleAnalysis from './pages/ScaleAnalysis';
import SensitivityPage from './pages/SensitivityPage';

const NAV_GROUPS = [
  {
    title: 'Prodotto',
    items: [
      { path: '/', label: 'Home', icon: 'H', end: true },
      { path: '/partecipante-favc', label: 'Partecipante FAVC', icon: 'F', end: false },
      { path: '/come-funziona', label: 'Come funziona', icon: 'R', end: false },
    ],
  },
  {
    title: 'Analisi',
    items: [
      { path: '/dashboard', label: 'Report / Analisi', icon: 'A', end: false },
      { path: '/full-rules-v1', label: 'Full Rules V1', icon: 'V1', end: false },
      { path: '/scala', label: 'Analisi per Scala', icon: 'S', end: false },
      { path: '/modelli', label: 'Modelli Regolamento', icon: 'M', end: false },
      { path: '/sensibilita', label: 'Sensibilita', icon: 'SE', end: false },
      { path: '/prezzi', label: 'Modello Prezzi', icon: 'P', end: false },
    ],
  },
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="brand-mark">FT</span>
            <span>FantaTrading</span>
          </div>
          <div className="sidebar-sub">V1 virtual capital pilot</div>
        </div>

        <nav className="nav">
          {NAV_GROUPS.map(group => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map(({ path, label, icon, end }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <span className="nav-icon">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-pill">Pilot virtuale</span>
          <span className="sidebar-pill">No payout reale</span>
          <span className="sidebar-pill">ROI ranking</span>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/partecipante-favc" element={<ParticipantFavc />} />
          <Route path="/come-funziona" element={<HowItWorks />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scala" element={<ScaleAnalysis />} />
          <Route path="/modelli" element={<RuleComparison />} />
          <Route path="/sensibilita" element={<SensitivityPage />} />
          <Route path="/prezzi" element={<PriceModelPage />} />
          <Route path="/full-rules-v1" element={<FullRulesV1 />} />
        </Routes>
      </main>
    </div>
  );
}
