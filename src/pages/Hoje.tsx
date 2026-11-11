import Icon from '../components/Icon';
import WaterCup from '../components/WaterCup';
import DeficitCard from '../components/DeficitCard';
import { Check, Empty, Progress, fmtMl, fmtValue, pct } from '../components/ui';
import { useStore } from '../store/StoreContext';
import { formatDuration, formatLong, formatTime, greeting, nowMinutes, toMinutes } from '../store/dates';
import { goalDone, mealList, recordTotal, waterTotal } from '../store/model';
import { dayNutrition, fmtKcal } from '../store/foods';
import { energy, isBirthday } from '../store/body';
import { TodayTraining } from './TreinoCiclo';
import { EVENT_KINDS, upcoming, whenText } from '../store/calendar';
import type { PageProps } from './types';
import type { DailyGoal, Day, Settings } from '../store/types';

export function nextMeal(settings: Settings, day: Day) {
  const n = nowMinutes();
  const pending = [...settings.meals]
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    .filter((m) => !day.meals[m.id]?.done);
  if (!pending.length) return null;
  const upcoming = pending.find((m) => toMinutes(m.time) >= n);
  const meal = upcoming || pending[pending.length - 1];
  return { meal, diff: toMinutes(meal.time) - n };
}

export default function Hoje({ go }: PageProps) {
  const { data, today, day, settings, update } = useStore();
  const tasks = day.tasks.filter((t) => !t.movedTo);
  const done = tasks.filter((t) => t.done).length;
  const water = waterTotal(day);
  const nm = nextMeal(settings, day);
  const name = settings.userName.trim();

  const toggleTask = (id: string) =>
    update((d) => {
      const t = d.days[today].tasks.find((t) => t.id === id);
      if (t) t.done = !t.done;
    });
  const addWater = (ml: number) => update((d) => d.days[today].water.push({ ml, at: Date.now() }));
  const rec = recordTotal(day);
  const kcal = dayNutrition(day).kcal;
  const meals = mealList(settings, day);
  const lastMeal = [...meals].reverse().find((m) => m.st.done);
  const en = energy(settings.profile);
  const addRec = (min: number) => update((d) => d.days[today].recording.push({ min, at: Date.now() }));
  const markMeal = (id: string) =>
    update((d) => {
      const m = d.days[today].meals;
      m[id] = { ...(m[id] || {}), done: true, doneAt: Date.now() }; // horário real do registro
    });
  const bumpGoal = (g: DailyGoal) =>
    update((d) => {
      const cur = d.days[today].goals[g.id] || 0;
      d.days[today].goals[g.id] = g.type === 'check' ? (cur ? 0 : 1) : cur + (g.step || 1);
    });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="muted">{formatLong(today)}</p>
          <h1>
            {isBirthday(settings.profile) ? 'Feliz aniversário' : greeting()}
            {name ? `, ${name}` : ''}! {isBirthday(settings.profile) ? '🎂' : '👋'}
          </h1>
        </div>
      </header>

      {/* Resumo do dia */}
      <section className="grid-3">
        <button className="card stat" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => go('tarefas')}>
          <div className="stat-icon"><Icon name="tarefas" /></div>
          <div>
            <div className="stat-value">{done}/{tasks.length}</div>
            <div className="stat-label">tarefas feitas</div>
          </div>
        </button>
        <button className="card stat" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => go('agua')}>
          <div className="stat-icon water"><Icon name="agua" /></div>
          <div>
            <div className="stat-value">{fmtMl(water)} <span className="muted small">/ {fmtMl(settings.waterGoal)}</span></div>
            <div className="stat-label">água hoje</div>
          </div>
        </button>
        <button className="card stat" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={() => go('alimentacao')}>
          <div className="stat-icon food"><Icon name="alimentacao" /></div>
          <div>
            {nm ? (
              <>
                <div className="stat-value">{nm.meal.name} · {nm.meal.time}</div>
                <div className="stat-label">
                  {nm.diff >= 0 ? `próxima refeição, em ${formatDuration(nm.diff)}` : 'refeição atrasada'}
                </div>
              </>
            ) : lastMeal ? (
              <>
                <div className="stat-value">{lastMeal.name} · {formatTime(lastMeal.st.doneAt ?? 0)}</div>
                <div className="stat-label">última refeição · {fmtKcal(kcal)} hoje</div>
              </>
            ) : (
              <>
                <div className="stat-value">Registrar</div>
                <div className="stat-label">nenhuma refeição registrada hoje</div>
              </>
            )}
          </div>
        </button>
      </section>

      <section className="grid home-grid">
        {/* Tarefas */}
        <div className="card">
          <div className="card-head">
            <h2>Tarefas do dia</h2>
            <button className="link" onClick={() => go('tarefas')}>Ver todas</button>
          </div>
          <Progress value={done} max={tasks.length} variant="success" />
          {tasks.length ? (
            <ul className="list">
              {tasks.slice(0, 6).map((t) => (
                <li key={t.id} className={`item ${t.done ? 'done' : ''}`}>
                  <Check on={t.done} onClick={() => toggleTask(t.id)} label="Marcar como feita" />
                  <span className="item-title">{t.title}</span>
                  {t.recurringId && <Icon name="repeat" size={14} className="muted" />}
                </li>
              ))}
              {tasks.length > 6 && <li className="muted small">+ {tasks.length - 6} tarefas</li>}
            </ul>
          ) : (
            <Empty>Nenhuma tarefa para hoje. <button className="link" onClick={() => go('tarefas')}>Adicionar</button></Empty>
          )}
        </div>

        {/* Água */}
        <div className="card">
          <div className="card-head">
            <h2>Água</h2>
            <button className="link" onClick={() => go('agua')}>Detalhes</button>
          </div>
          <div className="row" style={{ justifyContent: 'center', gap: 20 }}>
            <WaterCup value={water} goal={Math.max(settings.waterGoal, settings.waterIdeal || 0)} mark={settings.waterGoal} size={120} />
            <div className="field" style={{ gap: 8 }}>
              <div>
                <strong>{fmtMl(water)}</strong> <span className="muted">· mínimo {fmtMl(settings.waterGoal)}</span>
                <div className="muted small">ideal {fmtMl(settings.waterIdeal || settings.waterGoal)}</div>
              </div>
              <div className="row">
                {settings.waterQuick.map((ml) => (
                  <button key={ml} className="btn water sm" onClick={() => addWater(ml)}>+{fmtMl(ml)}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Treino do dia */}
        {data.workouts.length > 0 && (
          <div className="card">
            <div className="card-head">
              <h2>Treino de hoje</h2>
              <button className="link" onClick={() => go('treino')}>Abrir</button>
            </div>
            <TodayTraining compact onOpen={() => go('treino')} />
          </div>
        )}

        {/* Refeições */}
        <div className="card">
          <div className="card-head">
            <h2>Refeições</h2>
            <button className="link" onClick={() => go('alimentacao')}>Abrir</button>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span><strong>{fmtKcal(kcal)}</strong>{settings.kcalGoal > 0 && <span className="muted"> de {fmtKcal(settings.kcalGoal)}</span>}</span>
            {settings.kcalGoal > 0 && <span className="badge primary">{pct(kcal, settings.kcalGoal)}%</span>}
          </div>
          {settings.kcalGoal > 0 && <Progress value={kcal} max={settings.kcalGoal} variant={kcal > settings.kcalGoal ? '' : 'success'} />}
          {en.tdee && (
            <div className="muted small">
              Seu corpo gasta ~{fmtKcal(en.tdee)}/dia · {kcal <= en.tdee ? `faltam ${fmtKcal(en.tdee - kcal)}` : `${fmtKcal(kcal - en.tdee)} acima`}
            </div>
          )}
          {meals.length === 0 && (
            <Empty>Nada registrado ainda. <button className="link" onClick={() => go('alimentacao')}>Registrar refeição</button></Empty>
          )}
          <ul className="list">
            {meals.map((m) => {
                const st = m.st;
                return (
                  <li key={m.id} className={`item ${st?.done ? 'done' : ''}`}>
                    <Check on={!!st?.done} onClick={() => (st?.done ? go('alimentacao') : markMeal(m.id))} label="Marcar como feita" />
                    <span className="item-title">{m.name}</span>
                    {st?.done && st.doneAt ? (
                      <span className="badge success" title={`Sugerido: ${m.time}`}>{formatTime(st.doneAt)}</span>
                    ) : (
                      <span className="badge" title="Horário sugerido">{m.time}</span>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>

        {/* Déficit calórico (ao lado das refeições) */}
        <DeficitCard data={data} today={today} onOpen={() => go('alimentacao')} onProfile={() => go('config')} />

        {/* Calendário: próximos compromissos e corridas */}
        {upcoming(data.events, today, 1).length > 0 && (
          <div className="card">
            <div className="card-head">
              <h2><Icon name="calendario" size={20} /> Próximo na agenda</h2>
              <button className="link" onClick={() => go('calendario')}>Abrir</button>
            </div>
            <ul className="list">
              {upcoming(data.events, today, 3).map((ev) => (
                <li key={ev.id} className="item">
                  <span>{EVENT_KINDS[ev.kind].icon}</span>
                  <span className="item-title">{ev.title}</span>
                  <span className={`badge ${ev.date === today ? 'warning' : 'primary'}`}>{whenText(ev, today)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gravação */}
        <div className="card">
          <div className="card-head">
            <h2><img src="./renda.png" alt="" width="20" height="20" style={{ objectFit: 'contain' }} /> Renda</h2>
            <button className="link" onClick={() => go('gravacao')}>Abrir</button>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span><strong>{formatDuration(rec)}</strong> <span className="muted">de {formatDuration(settings.recordGoalMin)}</span></span>
            <span className={`badge ${rec >= settings.recordGoalMin ? 'success' : 'primary'}`}>{pct(rec, settings.recordGoalMin)}%</span>
          </div>
          <Progress value={rec} max={settings.recordGoalMin} variant={rec >= settings.recordGoalMin ? 'success' : ''} />
          <div className="row">
            {settings.recordQuick.map((m) => (
              <button key={m} className="btn sm" onClick={() => addRec(m)}>+{m} min</button>
            ))}
          </div>
        </div>

        {/* Metas do dia */}
        <div className="card">
          <div className="card-head">
            <h2>Metas do dia</h2>
            <button className="link" onClick={() => go('metas')}>Gerenciar</button>
          </div>
          {data.dailyGoals.length ? (
            <ul className="list">
              {data.dailyGoals.map((g) => {
                const v = day.goals[g.id] || 0;
                const ok = goalDone(g, v);
                return (
                  <li key={g.id} className={`item ${ok ? 'done' : ''}`}>
                    {g.type === 'check' ? (
                      <Check on={ok} onClick={() => bumpGoal(g)} label="Cumprida" />
                    ) : (
                      <button className="icon-btn" onClick={() => bumpGoal(g)} title={`+${g.step || 1}`}><Icon name="plus" /></button>
                    )}
                    <span className="item-title">{g.title}</span>
                    {g.type === 'count' && (
                      <span className={`badge ${ok ? 'success' : ''}`}>{fmtValue(v)}/{fmtValue(g.target, g.unit)}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>Sem metas diárias. <button className="link" onClick={() => go('metas')}>Criar meta</button></Empty>
          )}
        </div>

        {/* Metas de longo prazo */}
        {data.longGoals.length > 0 && (
          <div className="card">
            <div className="card-head">
              <h2>Longo prazo</h2>
              <button className="link" onClick={() => go('metas')}>Ver</button>
            </div>
            {data.longGoals.slice(0, 4).map((g) => (
              <div key={g.id} className="field">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span>{g.title}</span>
                  <span className="muted small">{pct(g.current, g.target)}%</span>
                </div>
                <Progress value={g.current} max={g.target} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
