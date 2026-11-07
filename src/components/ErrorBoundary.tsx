// Se uma tela quebrar, mostra um aviso só nela (o resto do app continua funcionando).
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  resetKey: string;
  children: ReactNode;
}

export default class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na tela:', error, info?.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // trocou de tela: tenta de novo
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <div className="card" style={{ alignItems: 'flex-start' }}>
          <h2>Algo deu errado nesta tela 😕</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Seus dados estão salvos. Tente recarregar. Se continuar, me mande esta mensagem:
          </p>
          <code className="small" style={{ overflowWrap: 'anywhere' }}>{String(this.state.error?.message || this.state.error)}</code>
          <div className="row">
            <button className="btn primary" onClick={() => location.reload()}>Recarregar</button>
            <button className="btn" onClick={() => this.setState({ error: null })}>Tentar de novo</button>
          </div>
        </div>
      </div>
    );
  }
}
