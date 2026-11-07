import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Switch } from '../components/ui.jsx';
import {
  getAutoLaunch,
  isElectron,
  notificationPermission,
  notify,
  pickTextFile,
  requestNotificationPermission,
  saveTextFile,
  setAutoLaunch,
} from '../platform.js';
import { useStore } from '../store/StoreContext.jsx';
import { dateKey } from '../store/dates.js';
import { defaultData, uid } from '../store/model.js';
import { exportJSON, parseBackup } from '../store/storage.js';

export default function Configuracoes() {
  const { data, settings, update, replaceAll } = useStore();
  const [auto, setAuto] = useState({ supported: false, enabled: false });
  const [perm, setPerm] = useState(notificationPermission);
  const [msg, setMsg] = useState('');

  useEffect(() => { getAutoLaunch().then(setAuto); }, []);
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(id);
  }, [msg]);

  const setS = (k, v) => update((d) => { d.settings[k] = v; });
  const setMeal = (id, k, v) => update((d) => { d.settings.meals.find((m) => m.id === id)[k] = v; });

  const doExport = () => {
    saveTextFile(`painel-pessoal-backup-${dateKey()}.json`, exportJSON(data));
    setMsg('Backup exportado!');
  };
  const doImport = async () => {
    const text = await pickTextFile();
    if (!text) return;
    try {
      const next = parseBackup(text);
      if (!confirm('Importar este backup? Os dados atuais serão SUBSTITUÍDOS.')) return;
      replaceAll(next);
      setMsg('Backup importado!');
    } catch (err) {
      alert(err.message);
    }
  };
  const doReset = () => {
    if (!confirm('Apagar TODOS os dados? Faça um backup antes. Isso não pode ser desfeito.')) return;
    if (!confirm('Tem certeza mesmo?')) return;
    replaceAll(defaultData());
    setMsg('Dados apagados.');
  };

  const testNotify = async () => {
    let p = perm;
    if (p !== 'granted') {
      p = await requestNotificationPermission();
      setPerm(p);
    }
    const ok = await notify('Painel Pessoal', 'As notificações estão funcionando! 🎉');
    if (!ok) alert('Não foi possível mostrar a notificação. Verifique as permissões do sistema.');
  };

  return (
    <div className="page">
      <header className="page-header"><h1>Configurações</h1></header>

      <section className="grid">
        <div className="card">
          <h2>Perfil e aparência</h2>
          <label className="field">
            <span>Seu nome (para a saudação)</span>
            <input className="input" value={settings.userName} onChange={(e) => setS('userName', e.target.value)} placeholder="Como quer ser chamado?" />
          </label>
          <div className="field">
            <span className="muted small">Tema</span>
            <div className="segmented">
              {[['light', 'Claro'], ['dark', 'Escuro'], ['system', 'Sistema']].map(([v, l]) => (
                <button key={v} className={settings.theme === v ? 'on' : ''} onClick={() => setS('theme', v)}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Notificações</h2>
          <Switch label="Ligar notificações" checked={settings.notificationsOn} onChange={(v) => setS('notificationsOn', v)} />
          {perm === 'denied' && <p className="small" style={{ color: 'var(--danger)', margin: 0 }}>O navegador bloqueou as notificações.</p>}
          <button className="btn" onClick={testNotify}><Icon name="bell" size={18} /> Testar notificação</button>
          {isElectron ? (
            <Switch
              label="Iniciar junto com o Windows"
              hint={auto.supported ? 'Abre escondido na bandeja para os lembretes funcionarem.' : 'Disponível no app instalado (não no modo de desenvolvimento).'}
              checked={auto.enabled}
              disabled={!auto.supported}
              onChange={async (v) => setAuto(await setAutoLaunch(v))}
            />
          ) : (
            <p className="muted small" style={{ margin: 0 }}>Lembretes funcionam enquanto o app estiver aberto.</p>
          )}
        </div>

        <div className="card">
          <h2>Água</h2>
          <label className="field">
            <span>Meta diária (ml)</span>
            <input
              className="input"
              type="number"
              min="250"
              step="50"
              value={settings.waterGoal}
              onChange={(e) => setS('waterGoal', Math.max(0, Number(e.target.value) || 0))}
              onBlur={(e) => setS('waterGoal', Math.max(250, Number(e.target.value) || 2000))}
            />
          </label>
          <div className="field">
            <span>Botões rápidos (ml)</span>
            <div className="row">
              {settings.waterQuick.map((ml, i) => (
                <input
                  key={i}
                  className="input w-num"
                  type="number"
                  min="10"
                  value={ml}
                  onChange={(e) => update((d) => { d.settings.waterQuick[i] = Math.max(0, Number(e.target.value) || 0); })}
                />
              ))}
            </div>
          </div>
          <Switch label="Lembrete de água" checked={settings.waterReminderOn} onChange={(v) => setS('waterReminderOn', v)} />
          <label className="field">
            <span>Intervalo do lembrete (minutos)</span>
            <input
              className="input"
              type="number"
              min="5"
              max="600"
              value={settings.waterReminderMinutes}
              onChange={(e) => setS('waterReminderMinutes', Math.max(1, Number(e.target.value) || 60))}
              onBlur={(e) => setS('waterReminderMinutes', Math.min(600, Math.max(5, Number(e.target.value) || 60)))}
            />
          </label>
          <div className="row">
            <label className="field"><span>Lembrar das</span><input className="input w-time" type="time" value={settings.waterActiveStart} onChange={(e) => setS('waterActiveStart', e.target.value || '07:00')} /></label>
            <label className="field"><span>até as</span><input className="input w-time" type="time" value={settings.waterActiveEnd} onChange={(e) => setS('waterActiveEnd', e.target.value || '22:00')} /></label>
          </div>
        </div>

        <div className="card">
          <h2>Refeições</h2>
          <label className="field">
            <span>Meta diária de calorias (kcal) — 0 desliga a meta</span>
            <input
              className="input"
              type="number"
              min="0"
              max="10000"
              step="50"
              value={settings.kcalGoal}
              onChange={(e) => setS('kcalGoal', Math.min(10000, Math.max(0, Number(e.target.value) || 0)))}
            />
          </label>
          <ul className="list">
            {settings.meals.map((m) => (
              <li key={m.id} className="item" style={{ padding: '4px 0' }}>
                <input className="input" value={m.name} onChange={(e) => setMeal(m.id, 'name', e.target.value)} aria-label="Nome da refeição" />
                <input className="input w-time" type="time" value={m.time} onChange={(e) => setMeal(m.id, 'time', e.target.value || '12:00')} aria-label="Horário" />
                <button
                  className="icon-btn danger"
                  title="Remover"
                  onClick={() => confirm(`Remover "${m.name}"?`) && update((d) => { d.settings.meals = d.settings.meals.filter((x) => x.id !== m.id); })}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn"
            onClick={() => update((d) => { d.settings.meals.push({ id: uid(), name: 'Nova refeição', time: '10:00' }); })}
          >
            <Icon name="plus" size={18} /> Adicionar refeição
          </button>
        </div>

        <div className="card">
          <h2>Gravação</h2>
          <label className="field">
            <span>Meta diária (minutos)</span>
            <input
              className="input"
              type="number"
              min="1"
              max="1440"
              value={settings.recordGoalMin}
              onChange={(e) => setS('recordGoalMin', Math.max(0, Number(e.target.value) || 0))}
              onBlur={(e) => setS('recordGoalMin', Math.min(1440, Math.max(1, Number(e.target.value) || 60)))}
            />
          </label>
          <div className="field">
            <span>Botões rápidos (min)</span>
            <div className="row">
              {settings.recordQuick.map((m, i) => (
                <input
                  key={i}
                  className="input w-num"
                  type="number"
                  min="1"
                  value={m}
                  onChange={(e) => update((d) => { d.settings.recordQuick[i] = Math.max(0, Number(e.target.value) || 0); })}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Tarefas</h2>
          <Switch
            label="Passar tarefas não feitas para o dia seguinte"
            hint="Automático na virada do dia. Você também pode adiar uma tarefa manualmente."
            checked={settings.carryOverTasks}
            onChange={(v) => setS('carryOverTasks', v)}
          />
        </div>

        <div className="card">
          <h2>Backup dos dados</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Seus dados ficam só neste computador. Exporte um arquivo JSON de vez em quando para não perder nada.
          </p>
          <div className="row">
            <button className="btn primary" onClick={doExport}><Icon name="download" size={18} /> Exportar</button>
            <button className="btn" onClick={doImport}><Icon name="upload" size={18} /> Importar</button>
          </div>
          <button className="btn danger" style={{ alignSelf: 'flex-start' }} onClick={doReset}><Icon name="trash" size={18} /> Apagar todos os dados</button>
        </div>
      </section>

      {msg && <div className="toast" role="status">{msg}</div>}
    </div>
  );
}
