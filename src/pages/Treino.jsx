import Icon from '../components/Icon.jsx';

// Aba reservada para os treinos (conteúdo a definir).
export default function Treino() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Treino</h1>
          <p className="muted">Em breve</p>
        </div>
      </header>
      <div className="card">
        <div className="empty">
          <Icon name="treino" size={40} />
          <p>Esta aba ainda está vazia.</p>
        </div>
      </div>
    </div>
  );
}
