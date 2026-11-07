import { useEffect, useState } from 'react';
import Icon from './components/Icon.jsx';
import { useReminders } from './hooks/useReminders.js';
import { useStore } from './store/StoreContext.jsx';
import Hoje from './pages/Hoje.jsx';
import Tarefas from './pages/Tarefas.jsx';
import Metas from './pages/Metas.jsx';
import Agua from './pages/Agua.jsx';
import Alimentacao from './pages/Alimentacao.jsx';
import Gravacao from './pages/Gravacao.jsx';
import Treino from './pages/Treino.jsx';
import Historico from './pages/Historico.jsx';
import Configuracoes from './pages/Configuracoes.jsx';

export const PAGES = [
  { id: 'hoje', label: 'Hoje', icon: 'hoje', Comp: Hoje },
  { id: 'tarefas', label: 'Tarefas', icon: 'tarefas', Comp: Tarefas },
  { id: 'metas', label: 'Metas', icon: 'metas', Comp: Metas },
  { id: 'agua', label: 'Água', icon: 'agua', Comp: Agua },
  { id: 'alimentacao', label: 'Alimentação', short: 'Refeições', icon: 'alimentacao', Comp: Alimentacao },
  { id: 'treino', label: 'Treino', icon: 'treino', Comp: Treino },
  { id: 'gravacao', label: 'Gravação', short: 'Gravar', icon: 'gravacao', Comp: Gravacao },
  { id: 'historico', label: 'Histórico', icon: 'historico', Comp: Historico },
  { id: 'config', label: 'Configurações', short: 'Ajustes', icon: 'config', Comp: Configuracoes },
];

const fromHash = () => {
  const id = location.hash.replace('#/', '');
  return PAGES.some((p) => p.id === id) ? id : 'hoje';
};

function useTheme(theme) {
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = t;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export default function App() {
  const { settings } = useStore();
  const [page, setPage] = useState(fromHash);
  const startedAt = useReminders();
  useTheme(settings.theme);

  useEffect(() => {
    const onHash = () => setPage(fromHash());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => {
    location.hash = `#/${id}`;
    document.querySelector('.content')?.scrollTo(0, 0);
  };

  const Current = PAGES.find((p) => p.id === page).Comp;

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Navegação principal">
        <div className="brand">
          <img src="./icon.png" alt="" width="32" height="32" />
          <span>Painel Pessoal</span>
        </div>
        {PAGES.map((p) => (
          <button
            key={p.id}
            className={`nav-item ${page === p.id ? 'active' : ''}`}
            onClick={() => go(p.id)}
            aria-current={page === p.id ? 'page' : undefined}
          >
            <Icon name={p.icon} />
            <span className="nav-label">{p.label}</span>
            <span className="nav-short">{p.short || p.label}</span>
          </button>
        ))}
      </nav>
      <main className="content">
        <Current go={go} startedAt={startedAt} />
      </main>
    </div>
  );
}
