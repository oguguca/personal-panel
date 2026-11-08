import { useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import type { ComponentType } from 'react';
import Icon, { type IconName } from './components/Icon';
import type { PageProps } from './pages/types';
import type { Theme } from './store/types';
import { useReminders } from './hooks/useReminders';
import { useStore } from './store/StoreContext';
import Hoje from './pages/Hoje';
import Tarefas from './pages/Tarefas';
import Metas from './pages/Metas';
import Alimentacao from './pages/Alimentacao';
import Gravacao from './pages/Gravacao';
import Treino from './pages/Treino';
import Calendario from './pages/Calendario';
import Evolucao from './pages/Evolucao';
import Historico from './pages/Historico';
import Configuracoes from './pages/Configuracoes';

interface Page {
  id: string;
  label: string;
  short?: string;
  icon?: IconName;
  img?: string;
  hidden?: boolean;
  parent?: string; // aba que fica marcada no menu
  Comp: ComponentType<PageProps>;
}

export const PAGES: Page[] = [
  { id: 'hoje', label: 'Hoje', icon: 'hoje', Comp: Hoje },
  { id: 'tarefas', label: 'Tarefas', icon: 'tarefas', Comp: Tarefas },
  { id: 'metas', label: 'Metas', icon: 'metas', Comp: Metas },
  // Água fica dentro de Alimentação (aba); a rota continua existindo para os links.
  { id: 'agua', label: 'Água', hidden: true, parent: 'alimentacao', Comp: (props: PageProps) => <Alimentacao {...props} tab="agua" /> },
  { id: 'alimentacao', label: 'Alimentação', short: 'Refeições', icon: 'alimentacao', Comp: Alimentacao },
  { id: 'calendario', label: 'Calendário', short: 'Agenda', icon: 'calendario', Comp: Calendario },
  { id: 'treino', label: 'Treino', icon: 'treino', Comp: Treino },
  { id: 'evolucao', label: 'Evolução', icon: 'evolucao', Comp: Evolucao },
  { id: 'gravacao', label: 'Renda', img: './renda.png', Comp: Gravacao },
  { id: 'historico', label: 'Histórico', icon: 'historico', Comp: Historico },
  { id: 'config', label: 'Configurações', short: 'Ajustes', icon: 'config', Comp: Configuracoes },
];

const fromHash = () => {
  const id = location.hash.replace('#/', '');
  return PAGES.some((p) => p.id === id) ? id : 'hoje';
};

function useTheme(theme: Theme) {
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

  const go = (id: string) => {
    location.hash = `#/${id}`;
    document.querySelector('.content')?.scrollTo(0, 0);
  };

  const currentPage = PAGES.find((p) => p.id === page) ?? PAGES[0];
  const Current = currentPage.Comp;

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Navegação principal">
        <div className="brand">
          <img src="./icon.png" alt="" width="32" height="32" />
          <span>Painel Pessoal</span>
        </div>
        {PAGES.filter((p) => !p.hidden).map((p) => (
          <button
            key={p.id}
            className={`nav-item ${page === p.id || currentPage.parent === p.id ? 'active' : ''}`}
            onClick={() => go(p.id)}
            aria-current={page === p.id || currentPage.parent === p.id ? 'page' : undefined}
          >
            {p.img ? <img src={p.img} alt="" width="20" height="20" className="nav-img" /> : <Icon name={p.icon ?? 'hoje'} />}
            <span className="nav-label">{p.label}</span>
            <span className="nav-short">{p.short || p.label}</span>
          </button>
        ))}
      </nav>
      <main className="content">
        <ErrorBoundary resetKey={page}>
          <Current go={go} startedAt={startedAt} />
        </ErrorBoundary>
      </main>
    </div>
  );
}
