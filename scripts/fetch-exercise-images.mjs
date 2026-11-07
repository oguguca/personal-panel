// Baixa as fotos (posição inicial e final) de cada exercício do free-exercise-db
// (https://github.com/yuhonas/free-exercise-db, domínio público / Unlicense)
// para public/exercises/<id>-0.jpg e <id>-1.jpg, e gera src/data/exercise-images.json.
// Uso: node scripts/fetch-exercise-images.mjs
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// id do nosso exercício -> pasta no free-exercise-db
const MAP = {
  'supino-reto-barra': 'Barbell_Bench_Press_-_Medium_Grip',
  'supino-inclinado-halteres': 'Incline_Dumbbell_Press',
  'crucifixo-halteres': 'Dumbbell_Flyes',
  'flexao': 'Pushups',
  'crossover': 'Cable_Crossover',
  'peck-deck': 'Butterfly',
  'paralelas': 'Dips_-_Chest_Version',
  'desenvolvimento-halteres': 'Dumbbell_Shoulder_Press',
  'desenvolvimento-maquina': 'Machine_Shoulder_Military_Press',
  'elevacao-lateral': 'Side_Lateral_Raise',
  'elevacao-frontal': 'Front_Dumbbell_Raise',
  'crucifixo-inverso': 'Reverse_Flyes',
  'face-pull': 'Face_Pull',
  'rosca-direta': 'Barbell_Curl',
  'rosca-alternada': 'Dumbbell_Alternate_Bicep_Curl',
  'rosca-martelo': 'Hammer_Curls',
  'rosca-scott': 'Preacher_Curl',
  'rosca-cabo': 'Standing_Biceps_Cable_Curl',
  'triceps-pulley': 'Triceps_Pushdown',
  'triceps-corda': 'Triceps_Pushdown_-_Rope_Attachment',
  'triceps-testa': 'Lying_Triceps_Press',
  'triceps-frances': 'Seated_Triceps_Press',
  'mergulho-banco': 'Bench_Dips',
  'rosca-punho': 'Seated_Dumbbell_Palms-Up_Wrist_Curl',
  'farmer-walk': 'Farmers_Walk',
  'barra-fixa': 'Pullups',
  'puxada-frente': 'Wide-Grip_Lat_Pulldown',
  'remada-curvada': 'Bent_Over_Barbell_Row',
  'remada-unilateral': 'One-Arm_Dumbbell_Row',
  'remada-baixa': 'Seated_Cable_Rows',
  'pullover': 'Straight-Arm_Dumbbell_Pullover',
  'encolhimento': 'Dumbbell_Shrug',
  'remada-alta': 'Upright_Barbell_Row',
  'levantamento-terra': 'Barbell_Deadlift',
  'extensao-lombar': 'Hyperextensions_Back_Extensions',
  'superman': 'Superman',
  'abdominal-crunch': 'Crunches',
  'prancha': 'Plank',
  'elevacao-pernas': 'Flat_Bench_Lying_Leg_Raise',
  'abdominal-bicicleta': 'Air_Bike',
  'roda-abdominal': 'Ab_Roller',
  'prancha-lateral': 'Side_Bridge',
  'giro-russo': 'Russian_Twist',
  'lenhador-cabo': 'Standing_Cable_Wood_Chop',
  'agachamento-livre': 'Barbell_Squat',
  'agachamento-corpo': 'Bodyweight_Squat',
  'agachamento-goblet': 'Goblet_Squat',
  'leg-press': 'Leg_Press',
  'cadeira-extensora': 'Leg_Extensions',
  'afundo': 'Dumbbell_Lunges',
  'agachamento-bulgaro': 'Split_Squat_with_Dumbbells',
  'hack': 'Hack_Squat',
  'stiff': 'Stiff-Legged_Barbell_Deadlift',
  'terra-romeno-halteres': 'Stiff-Legged_Dumbbell_Deadlift',
  'mesa-flexora': 'Lying_Leg_Curls',
  'cadeira-flexora': 'Seated_Leg_Curl',
  'elevacao-pelvica': 'Barbell_Hip_Thrust',
  'ponte-gluteo': 'Butt_Lift_Bridge',
  'coice-cabo': 'One-Legged_Cable_Kickback',
  'cadeira-abdutora': 'Thigh_Abductor',
  'abducao-elastico': 'Monster_Walk',
  'kettlebell-swing': 'One-Arm_Kettlebell_Swings',
  'cadeira-adutora': 'Thigh_Adductor',
  'agachamento-sumo': 'Plie_Dumbbell_Squat',
  'panturrilha-em-pe': 'Standing_Calf_Raises',
  'panturrilha-sentado': 'Seated_Calf_Raise',
  'panturrilha-degrau': 'Standing_Dumbbell_Calf_Raise',
};

mkdirSync('public/exercises', { recursive: true });
const ok = [];
for (const [id, folder] of Object.entries(MAP)) {
  try {
    for (const n of [0, 1]) {
      const out = `public/exercises/${id}-${n}.jpg`;
      if (existsSync(out)) continue;
      const res = await fetch(`${BASE}/${folder}/${n}.jpg`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('não é JPEG');
      writeFileSync(out, buf);
    }
    ok.push(id);
  } catch (err) {
    console.warn(`falhou ${id} (${folder}): ${err.message}`);
  }
}
writeFileSync('src/data/exercise-images.json', JSON.stringify(ok.sort()));
console.log(`${ok.length}/${Object.keys(MAP).length} exercícios com imagem`);
