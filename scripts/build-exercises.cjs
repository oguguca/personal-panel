// Monta a biblioteca de exercícios a partir do free-exercise-db (domínio público / Unlicense):
//  - src/data/exercises-extra.json : exercícios importados (nome traduzido + original em inglês)
//  - public/exercises/<id>-0.jpg / -1.jpg : fotos reduzidas (400 px) de início/fim do movimento
//  - src/data/exercise-images.json : ids que têm foto
// Roda dentro do Electron para usar o redimensionador nativo:  npm run exercises
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const IMG_W = 400;
const JPEG_Q = 72;

// Nossos exercícios com texto próprio (src/data/exercises.js) -> pasta equivalente no banco.
const CURATED = {
  'supino-reto-barra': 'Barbell_Bench_Press_-_Medium_Grip', 'supino-inclinado-halteres': 'Incline_Dumbbell_Press',
  'crucifixo-halteres': 'Dumbbell_Flyes', 'flexao': 'Pushups', 'crossover': 'Cable_Crossover', 'peck-deck': 'Butterfly',
  'paralelas': 'Dips_-_Chest_Version', 'desenvolvimento-halteres': 'Dumbbell_Shoulder_Press',
  'desenvolvimento-maquina': 'Machine_Shoulder_Military_Press', 'elevacao-lateral': 'Side_Lateral_Raise',
  'elevacao-frontal': 'Front_Dumbbell_Raise', 'crucifixo-inverso': 'Reverse_Flyes', 'face-pull': 'Face_Pull',
  'rosca-direta': 'Barbell_Curl', 'rosca-alternada': 'Dumbbell_Alternate_Bicep_Curl', 'rosca-martelo': 'Hammer_Curls',
  'rosca-scott': 'Preacher_Curl', 'rosca-cabo': 'Standing_Biceps_Cable_Curl', 'triceps-pulley': 'Triceps_Pushdown',
  'triceps-corda': 'Triceps_Pushdown_-_Rope_Attachment', 'triceps-testa': 'Lying_Triceps_Press',
  'triceps-frances': 'Seated_Triceps_Press', 'mergulho-banco': 'Bench_Dips', 'rosca-punho': 'Seated_Dumbbell_Palms-Up_Wrist_Curl',
  'farmer-walk': 'Farmers_Walk', 'barra-fixa': 'Pullups', 'puxada-frente': 'Wide-Grip_Lat_Pulldown',
  'remada-curvada': 'Bent_Over_Barbell_Row', 'remada-unilateral': 'One-Arm_Dumbbell_Row', 'remada-baixa': 'Seated_Cable_Rows',
  'pullover': 'Straight-Arm_Dumbbell_Pullover', 'encolhimento': 'Dumbbell_Shrug', 'remada-alta': 'Upright_Barbell_Row',
  'levantamento-terra': 'Barbell_Deadlift', 'extensao-lombar': 'Hyperextensions_Back_Extensions', 'superman': 'Superman',
  'abdominal-crunch': 'Crunches', 'prancha': 'Plank', 'elevacao-pernas': 'Flat_Bench_Lying_Leg_Raise',
  'abdominal-bicicleta': 'Air_Bike', 'roda-abdominal': 'Ab_Roller', 'prancha-lateral': 'Side_Bridge',
  'giro-russo': 'Russian_Twist', 'lenhador-cabo': 'Standing_Cable_Wood_Chop', 'agachamento-livre': 'Barbell_Squat',
  'agachamento-corpo': 'Bodyweight_Squat', 'agachamento-goblet': 'Goblet_Squat', 'leg-press': 'Leg_Press',
  'cadeira-extensora': 'Leg_Extensions', 'afundo': 'Dumbbell_Lunges', 'agachamento-bulgaro': 'Split_Squat_with_Dumbbells',
  'hack': 'Hack_Squat', 'stiff': 'Stiff-Legged_Barbell_Deadlift', 'terra-romeno-halteres': 'Stiff-Legged_Dumbbell_Deadlift',
  'mesa-flexora': 'Lying_Leg_Curls', 'cadeira-flexora': 'Seated_Leg_Curl', 'elevacao-pelvica': 'Barbell_Hip_Thrust',
  'ponte-gluteo': 'Butt_Lift_Bridge', 'coice-cabo': 'One-Legged_Cable_Kickback', 'cadeira-abdutora': 'Thigh_Abductor',
  'abducao-elastico': 'Monster_Walk', 'kettlebell-swing': 'One-Arm_Kettlebell_Swings', 'cadeira-adutora': 'Thigh_Adductor',
  'agachamento-sumo': 'Plie_Dumbbell_Squat', 'panturrilha-em-pe': 'Standing_Calf_Raises',
  'panturrilha-sentado': 'Seated_Calf_Raise', 'panturrilha-degrau': 'Standing_Dumbbell_Calf_Raise',
};

const MUSCLE = {
  abdominals: 'abs', abductors: 'abductors', adductors: 'adductors', biceps: 'biceps', calves: 'calves', chest: 'chest',
  forearms: 'forearms', glutes: 'glutes', hamstrings: 'hamstrings', lats: 'lats', 'lower back': 'lowerback',
  'middle back': 'midback', neck: 'neck', quadriceps: 'quads', shoulders: 'shoulders', traps: 'traps', triceps: 'triceps',
};
const EQUIP = {
  barbell: 'Barra', dumbbell: 'Halteres', other: 'Outro', 'body only': 'Peso corporal', cable: 'Cabo', machine: 'Máquina',
  kettlebells: 'Kettlebell', bands: 'Elástico', 'medicine ball': 'Medicine ball', 'exercise ball': 'Bola suíça',
  'foam roll': 'Rolo de espuma', 'e-z curl bar': 'Barra W',
};
const CATEGORY = {
  strength: 'Força', stretching: 'Alongamento', plyometrics: 'Pliometria', powerlifting: 'Powerlifting',
  'olympic weightlifting': 'Levantamento olímpico', strongman: 'Strongman', cardio: 'Cardio',
};
const LEVEL = { beginner: 'Iniciante', intermediate: 'Intermediário', expert: 'Avançado' };

// ---------------- tradução do nome (glossário de academia) ----------------
const EQUIP_RULES = [
  [/\bsmith machine\b/, 'no Smith'], [/\be-?z[- ]?(curl )?bar\b/, 'com barra W'], [/\bbarbells?\b/, 'com barra'],
  [/\bdumbbells?\b/, 'com halteres'], [/\bcables?\b/, 'no cabo'], [/\b(machine|lever|leverage)\b/, 'na máquina'],
  [/\bkettlebells?\b/, 'com kettlebell'], [/\b(with )?bands?\b/, 'com elástico'], [/\bmedicine ball\b/, 'com medicine ball'],
  [/\b(exercise|stability|swiss|physio) ?ball\b/, 'na bola suíça'], [/\bfoam roll(er)?\b|\bsmr\b/, 'com rolo (liberação)'],
  [/\b(rope( attachment)?)\b/, 'com corda'], [/\bv-bar( attachment)?\b/, 'com barra V'], [/\bsled\b/, 'com trenó'],
  [/\btrap bar\b/, 'com barra hexagonal'], [/\bplates?\b/, 'com anilha'],
];
const CORE_RULES = [
  [/\bclean and (jerk|press)\b/, 'Arremesso'], [/\bbench press\b/, 'Supino'], [/\bfloor press\b/, 'Supino no chão'],
  [/\b(shoulder|military|overhead) press\b/, 'Desenvolvimento'], [/\barnold press\b/, 'Desenvolvimento Arnold'],
  [/\bcalf press\b/, 'Panturrilha no leg press'], [/\bleg press\b/, 'Leg press'], [/\bcalf raises?\b/, 'Panturrilha'],
  [/\bleg extensions?\b/, 'Cadeira extensora'], [/\bleg curls?\b/, 'Flexora'], [/\bhammer curls?\b/, 'Rosca martelo'],
  [/\bpreacher curls?\b/, 'Rosca Scott'], [/\bconcentration curls?\b/, 'Rosca concentrada'], [/\bwrist curls?\b/, 'Rosca de punho'],
  [/\bspider curls?\b/, 'Rosca spider'], [/\bzottman curls?\b/, 'Rosca Zottman'], [/\bdrag curls?\b/, 'Rosca drag'],
  [/\bcurls?\b/, 'Rosca'], [/\bupright rows?\b/, 'Remada alta'], [/\bt-bar rows?\b/, 'Remada cavalinho'], [/\brows?\b/, 'Remada'],
  [/\b(lat )?pull-?downs?\b/, 'Puxada'], [/\bpull-?ups?\b/, 'Barra fixa'], [/\bchin-?ups?\b/, 'Barra fixa supinada'],
  [/\bpush-?ups?\b/, 'Flexão'], [/\bpush-?downs?\b/, 'Tríceps pulley'], [/\bdips?\b/, 'Mergulho'],
  [/\bfl(y|ies|yes|ys)\b/, 'Crucifixo'], [/\bcross-?overs?\b/, 'Crossover'], [/\bpull-?overs?\b/, 'Pullover'],
  [/\bface pulls?\b/, 'Face pull'], [/\bfront raises?\b/, 'Elevação frontal'], [/\b(side )?lateral raises?\b|\blaterals\b/, 'Elevação lateral'],
  [/\bleg raises?\b/, 'Elevação de pernas'], [/\bknee raises?\b/, 'Elevação de joelhos'], [/\braises?\b/, 'Elevação'],
  [/\bromanian deadlifts?\b/, 'Terra romeno'], [/\bstiff[- ]legged deadlifts?\b/, 'Stiff'], [/\bsumo deadlifts?\b/, 'Terra sumô'],
  [/\bdeadlifts?\b/, 'Levantamento terra'], [/\bgood ?mornings?\b/, 'Good morning'], [/\bhip thrusts?\b/, 'Elevação pélvica'],
  [/\bbridges?\b/, 'Ponte'], [/\bfront squats?\b/, 'Agachamento frontal'], [/\bhack squats?\b/, 'Agachamento hack'],
  [/\bsplit squats?\b/, 'Agachamento afundo'], [/\bpistol squats?\b/, 'Agachamento pistola'], [/\bsquats?\b/, 'Agachamento'],
  [/\blunges?\b/, 'Afundo'], [/\bstep-?ups?\b/, 'Subida no banco'], [/\bshrugs?\b/, 'Encolhimento'],
  [/\bab roller\b/, 'Roda abdominal'], [/\bcrunch(es)?\b/, 'Abdominal'], [/\bsit-?ups?\b/, 'Abdominal completo'],
  [/\bplanks?\b/, 'Prancha'], [/\bkick-?backs?\b/, 'Coice'], [/\bskull ?crushers?\b/, 'Tríceps testa'],
  [/\btriceps (extensions?|press)\b/, 'Tríceps extensão'], [/\bextensions?\b/, 'Extensão'], [/\btwists?\b/, 'Giro'],
  [/\bwood ?chops?\b/, 'Lenhador'], [/\bswings?\b/, 'Swing'], [/\bpower cleans?\b/, 'Power clean'], [/\bhang cleans?\b/, 'Hang clean'],
  [/\bcleans?\b/, 'Clean'], [/\bsnatch(es)?\b/, 'Arranco'], [/\bjerks?\b/, 'Jerk'], [/\bthrusters?\b/, 'Thruster'],
  [/\bburpees?\b/, 'Burpee'], [/\bmountain climbers?\b/, 'Escalador'], [/\bjumping jacks?\b/, 'Polichinelo'],
  [/\bjump(s|ing)?\b/, 'Salto'], [/\bhops?\b/, 'Saltitos'], [/\bsprints?\b/, 'Tiro de corrida'], [/\b(running|jogging)\b/, 'Corrida'],
  [/\browing\b/, 'Remo ergômetro'], [/\bbicycling\b/, 'Bicicleta'], [/\belliptical\b/, 'Elíptico'], [/\bstairmaster\b/, 'Escada'],
  [/\bwalk(ing)?\b/, 'Caminhada'], [/\bcarry\b/, 'Carregamento'], [/\bthrows?\b|\btoss\b/, 'Arremesso'], [/\bslams?\b/, 'Arremesso no chão'],
  [/\bstretch(es)?\b/, 'Alongamento'], [/\brotations?\b/, 'Rotação'], [/\bcircles\b/, 'Círculos'], [/\bpress\b/, 'Press'],
  [/\bholds?\b/, 'Isometria'], [/\brollouts?\b/, 'Rollout'], [/\bwindmills?\b/, 'Moinho'], [/\bturkish get-?up\b/, 'Levantamento turco'],
];
const MOD_RULES = [
  [/\bbent[- ]arms?\b/, 'braços flexionados'], [/\bstraight[- ]arms?\b/, 'braços estendidos'], [/\bstraight[- ]legs?\b/, 'pernas estendidas'],
  [/\bbody ?weight\b/, 'peso corporal'], [/\bpush\b/, 'empurrada'], [/\bstance\b/, 'base'], [/\bstiff\b/, 'rígido'],
  [/\bpause\b/, 'com pausa'], [/\bspeed\b/, 'explosivo'], [/\bheavy\b/, 'pesado'], [/\bsingle\b/, 'unilateral'],
  [/\bincline\b/, 'inclinado'], [/\bdecline\b/, 'declinado'], [/\bflat\b/, 'reto'], [/\bseated\b/, 'sentado'],
  [/\bstanding\b/, 'em pé'], [/\blying\b/, 'deitado'], [/\bkneeling\b/, 'ajoelhado'], [/\bbent[- ]over\b/, 'curvado'],
  [/\b(one|single)[- ]arm(ed)?\b/, 'unilateral'], [/\b(one|single)[- ]leg(ged)?\b/, 'uma perna'], [/\balternat(e|ing)\b/, 'alternado'],
  [/\breverse\b/, 'inverso'], [/\b(close|narrow)[- ]grip\b/, 'pegada fechada'], [/\bwide[- ]grip\b/, 'pegada aberta'],
  [/\bmedium[- ]grip\b/, 'pegada média'], [/\bnarrow stance\b/, 'base fechada'], [/\bwide stance\b/, 'base aberta'],
  [/\b(underhand|supinated|palms?[- ]up)\b/, 'supinado'], [/\b(overhand|pronated|palms?[- ]down)\b/, 'pronado'],
  [/\bneutral grip\b/, 'pegada neutra'], [/\bbehind (the )?(neck|head)\b/, 'atrás da nuca'], [/\boverhead\b/, 'acima da cabeça'],
  [/\bfront\b/, 'frontal'], [/\brear( delt)?\b/, 'posterior'], [/\b(side|lateral)\b/, 'lateral'], [/\bhigh\b/, 'alto'],
  [/\blow\b/, 'baixo'], [/\bweighted\b/, 'com peso'], [/\bassisted\b/, 'assistido'], [/\bisometric\b/, 'isométrico'],
  [/\blower back\b/, 'lombar'], [/\bupper back\b/, 'parte alta das costas'], [/\bchest\b/, 'peito'], [/\btriceps\b/, 'tríceps'],
  [/\bbiceps?\b/, 'bíceps'], [/\bglutes?\b/, 'glúteo'], [/\bhips?\b/, 'quadril'], [/\bcalf|calves\b/, 'panturrilha'],
  [/\bshoulders?\b/, 'ombro'], [/\blegs?\b/, 'pernas'], [/\barms?\b/, 'braços'], [/\bwrists?\b/, 'punho'], [/\bneck\b/, 'pescoço'],
  [/\bknees?\b/, 'joelhos'], [/\bankles?\b/, 'tornozelo'], [/\bback\b/, 'costas'], [/\bhamstrings?\b/, 'posterior da coxa'],
  [/\bquad(riceps|s)?\b/, 'quadríceps'], [/\badductors?\b/, 'adutor'], [/\babductors?\b/, 'abdutor'], [/\bobliques?\b/, 'oblíquos'],
  [/\b(abs|abdominals?)\b/, 'abdômen'], [/\bspine|spinal\b/, 'coluna'], [/\bbench\b/, 'no banco'], [/\bbox\b/, 'na caixa'],
  [/\bfloor\b/, 'no chão'], [/\bwall\b/, 'na parede'], [/\bpartner\b/, 'com parceiro'], [/\btwisting\b/, 'com giro'],
];
const STOP = new Set([
  'with', 'to', 'and', 'on', 'the', 'a', 'an', 'from', 'in', 'of', 'for', 'version', 'attachment', 'grip', '-', '&',
  'one', 'over', 'up', 'out', 'into', 'at', 'point', 'multiple', 'response', 'bent', 'bent-', 'arm', 'leg',
]);

// Nomes traduzidos à mão (cardio e casos que o glossário não resolve bem).
const OVERRIDES = {
  'Bicycling': 'Bicicleta (ao ar livre)',
  'Bicycling, Stationary': 'Bicicleta ergométrica',
  'Elliptical Trainer': 'Elíptico (transport)',
  'Jogging, Treadmill': 'Trote na esteira',
  'Prowler Sprint': 'Tiro empurrando trenó (prowler)',
  'Recumbent Bike': 'Bicicleta horizontal',
  'Rope Jumping': 'Pular corda',
  'Rowing, Stationary': 'Remo ergômetro',
  'Running, Treadmill': 'Corrida na esteira',
  'Skating': 'Patinação',
  'Stairmaster': 'Escada ergométrica (stairmaster)',
  'Step Mill': 'Escada rolante ergométrica (step mill)',
  'Trail Running/Walking': 'Corrida/caminhada em trilha',
  'Walking, Treadmill': 'Caminhada na esteira',
};

function translate(en) {
  if (OVERRIDES[en]) return OVERRIDES[en];
  let s = ` ${en.toLowerCase().replace(/[(),/]/g, ' ').replace(/\s+-\s+/g, ' ').replace(/\s+/g, ' ')} `;
  const take = (rules, many) => {
    const out = [];
    for (const [re, pt] of rules) {
      if (re.test(s)) {
        out.push(pt);
        s = s.replace(re, ' ');
        if (!many) break;
      }
    }
    return out;
  };
  const equip = take(EQUIP_RULES, true);
  const core = take(CORE_RULES, false);
  const mods = take(MOD_RULES, true);
  const rest = s.split(/\s+/).filter((w) => w && !STOP.has(w) && !/^\d+$/.test(w));
  if (!core.length && !mods.length) return en; // não reconheci: mantém o original
  const words = [...core, ...mods, ...equip, ...rest.map((w) => w.charAt(0).toUpperCase() + w.slice(1))];
  const txt = words.join(' ').replace(/\s+/g, ' ').trim();
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

// ---------------- download + redimensionamento das fotos ----------------
async function fetchBuf(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      if (r.status === 404) return null;
    } catch {}
    await new Promise((res) => setTimeout(res, 500 * (i + 1)));
  }
  return null;
}

async function saveImages(id, folder) {
  const file = (n) => path.join(ROOT, 'public', 'exercises', `${id}-${n}.jpg`);
  if (!process.env.FORCE && fs.existsSync(file(0)) && fs.existsSync(file(1))) return true; // já baixadas
  for (const n of [0, 1]) {
    const buf = await fetchBuf(`${RAW}/exercises/${folder}/${n}.jpg`);
    if (!buf) return false;
    let img = nativeImage.createFromBuffer(buf);
    if (img.isEmpty()) return false;
    if (img.getSize().width > IMG_W) img = img.resize({ width: IMG_W, quality: 'good' });
    fs.writeFileSync(path.join(ROOT, 'public', 'exercises', `${id}-${n}.jpg`), img.toJPEG(JPEG_Q));
  }
  return true;
}

async function pool(items, size, fn) {
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const it = items[i++];
      await fn(it);
      if (++done % 100 === 0) console.log(`  ${done}/${items.length} fotos…`);
    }
  }));
}

app.whenReady().then(async () => {
  try {
    console.log('Baixando lista do free-exercise-db…');
    const db = JSON.parse((await fetchBuf(`${RAW}/dist/exercises.json`)).toString('utf8'));
    const curatedFolders = new Set(Object.values(CURATED));
    const slug = (id) => 'x-' + id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const extra = db
      .filter((e) => !curatedFolders.has(e.id))
      .map((e) => ({
        id: slug(e.id),
        src: e.id,
        name: translate(e.name),
        en: e.name,
        m: [...new Set(e.primaryMuscles.map((m) => MUSCLE[m]).filter(Boolean))],
        s: [...new Set(e.secondaryMuscles.map((m) => MUSCLE[m]).filter(Boolean))],
        eq: EQUIP[e.equipment] || 'Outro',
        cat: CATEGORY[e.category] || 'Força',
        level: LEVEL[e.level] || '',
        steps: e.instructions,
        lang: 'en',
      }));

    fs.mkdirSync(path.join(ROOT, 'public', 'exercises'), { recursive: true });
    const jobs = [
      ...Object.entries(CURATED).map(([id, folder]) => ({ id, folder })),
      ...extra.map((e) => ({ id: e.id, folder: e.src })),
    ];
    console.log(`Baixando e reduzindo ${jobs.length} pares de fotos…`);
    const withImg = [];
    await pool(jobs, 12, async (j) => { if (await saveImages(j.id, j.folder)) withImg.push(j.id); });

    fs.writeFileSync(path.join(ROOT, 'src', 'data', 'exercises-extra.json'), JSON.stringify(extra.map(({ src, ...e }) => e)));
    fs.writeFileSync(path.join(ROOT, 'src', 'data', 'exercise-images.json'), JSON.stringify(withImg.sort()));
    console.log(`Pronto: ${extra.length} exercícios importados, ${withImg.length} com foto.`);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
  app.quit();
});
