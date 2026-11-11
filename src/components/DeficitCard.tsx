// Card "Déficit calórico" da tela Hoje: quanto o corpo gasta x quanto comeu, e os últimos 7 dias.
import { energy } from '../store/body';
import { addDays, parseKey } from '../store/dates';
import { dayNutrition } from '../store/foods';
import type { Data, DayKey } from '../store/types';
import { Empty } from './ui';

const KCAL_PER_KG = 7700; // ~7.700 kcal = 1 kg de gordura
const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');

export default function DeficitCard({ data, today, onOpen, onProfile }: { data: Data; today: DayKey; onOpen: () => void; onProfile: () => void }) {
  const { tdee } = energy(data.settings.profile);

  if (!tdee) {
    return (
      <div className="card">
        <div className="card-head"><h2>Déficit calórico</h2></div>
        <Empty>
          Para calcular o déficit, preencha altura, peso, idade e sexo.{' '}
          <button className="link" onClick={onProfile}>Abrir configurações</button>
        </Empty>
      </div>
    );
  }

  const kcal = dayNutrition(data.days[today]).kcal;
  const diff = tdee - kcal; // > 0 = déficit
  const deficit = diff >= 0;

  // barra: escala = o maior entre gasto e comido
  const scale = Math.max(tdee, kcal) || 1;
  const eatenPct = (Math.min(kcal, tdee) / scale) * 100;
  const gapPct = (Math.abs(diff) / scale) * 100;

  // últimos 7 dias (só os dias com comida registrada)
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i - 6);
    const eaten = dayNutrition(data.days[key]).kcal;
    return { key, eaten, diff: eaten ? tdee - eaten : null, isToday: key === today };
  });
  const logged = week.filter((d) => d.diff !== null && !d.isToday) as { key: DayKey; diff: number }[];
  // escala pelos dias que já acabaram (hoje ainda está pela metade e deixaria os outros pequenos)
  const max = Math.max(1, ...(logged.length ? logged : week).map((d) => Math.abs(d.diff ?? 0)));
  const weekSum = logged.reduce((s, d) => s + d.diff, 0);
  const avg = logged.length ? weekSum / logged.length : 0;

  return (
    <div className="card deficit">
      <div className="card-head">
        <h2>Déficit calórico</h2>
        <button className="link" onClick={onOpen}>Abrir</button>
      </div>

      <div className="deficit-hero">
        <b>{deficit ? '−' : '+'}{fmt(Math.abs(diff))}</b>
        <span className="deficit-unit">kcal</span>
        <span className={`deficit-pill ${deficit ? 'good' : 'warn'}`}>{deficit ? '▼ déficit' : '▲ acima do gasto'}</span>
      </div>
      <span className="muted small">Hoje, até agora · ≈ {(Math.abs(diff) / KCAL_PER_KG).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg de gordura</span>

      <div className="deficit-bar" role="img" aria-label={`Comeu ${fmt(kcal)} de ${fmt(tdee)} kcal gastas`}>
        <span className="deficit-eaten" style={{ width: `${eatenPct}%` }} title={`Comeu ${fmt(kcal)} kcal`} />
        <span className={`deficit-gap ${deficit ? 'good' : 'warn'}`} style={{ width: `${gapPct}%` }} title={`${deficit ? 'Déficit' : 'Acima'}: ${fmt(Math.abs(diff))} kcal`} />
      </div>
      <div className="deficit-legend">
        <span><i className="dot eaten" /> Comeu <b>{fmt(kcal)}</b></span>
        <span><i className={`dot ${deficit ? 'good' : 'warn'}`} /> {deficit ? 'Déficit' : 'Acima'} <b>{fmt(Math.abs(diff))}</b></span>
        <span className="muted">Gasta ~{fmt(tdee)}</span>
      </div>

      <div className="deficit-week">
        <span className="deficit-week-title">Últimos 7 dias</span>
        <div className="deficit-cols">
          {week.map((d) => {
            const h = d.diff === null ? 0 : Math.min(100, (Math.abs(d.diff) / max) * 100);
            const good = (d.diff ?? 0) >= 0;
            const label = parseKey(d.key).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
            const tip = d.diff === null ? 'Sem refeições registradas' : `${good ? 'Déficit' : 'Acima'} de ${fmt(Math.abs(d.diff))} kcal · comeu ${fmt(d.eaten)}${d.isToday ? ' (até agora)' : ''}`;
            return (
              <div key={d.key} className={`deficit-col ${d.isToday ? 'today' : ''}`} title={`${label}: ${tip}`}>
                <div className="deficit-col-up">{d.diff === null ? <i className="deficit-none">–</i> : good && <span className="good" style={{ height: `${h}%` }} />}</div>
                <div className="deficit-col-down">{!good && <span className="warn" style={{ height: `${h}%` }} />}</div>
                <span className="deficit-col-day">{d.isToday ? 'hoje' : label}</span>
              </div>
            );
          })}
        </div>
        <span className="muted small">
          {logged.length
            ? <>Média {avg >= 0 ? 'de déficit' : 'acima'}: <b>{fmt(Math.abs(avg))} kcal/dia</b> ({logged.length} {logged.length === 1 ? 'dia registrado' : 'dias registrados'}) ·{weekSum >= 0 ? '≈ −' : '≈ +'}{(Math.abs(weekSum) / KCAL_PER_KG).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg no período</>
            : 'Registre as refeições dos dias para ver a semana.'}
        </span>
      </div>
    </div>
  );
}
