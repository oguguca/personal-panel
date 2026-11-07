// Biblioteca de exercícios (texto próprio). Dicas gerais: em caso de dúvida, procure um profissional.
// m = músculos principais, s = secundários, eq = equipamento, steps = passo a passo.
import EXTRA from './exercises-extra.json' with { type: 'json' };
import type { Exercise } from '../store/types';

export const MUSCLES: Record<string, string> = {
  chest: 'Peito',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraço',
  abs: 'Abdômen',
  obliques: 'Oblíquos',
  lats: 'Costas (dorsais)',
  midback: 'Meio das costas',
  traps: 'Trapézio',
  lowerback: 'Lombar',
  neck: 'Pescoço',
  glutes: 'Glúteos',
  abductors: 'Abdutores',
  quads: 'Quadríceps',
  hamstrings: 'Posteriores da coxa',
  adductors: 'Adutores',
  calves: 'Panturrilhas',
};

export const EQUIPMENT = [
  'Máquina', 'Halteres', 'Cabo', 'Barra', 'Barra W', 'Peso corporal', 'Kettlebell', 'Elástico',
  'Medicine ball', 'Bola suíça', 'Rolo de espuma', 'Acessório', 'Outro',
];

export const CATEGORIES = ['Força', 'Alongamento', 'Pliometria', 'Powerlifting', 'Levantamento olímpico', 'Strongman', 'Cardio'];

const ex = (id: string, name: string, m: string[], s: string[], eq: string, steps: string[]): Exercise => ({ id, name, m, s, eq, steps, cat: 'Força', curated: true });

// Exercícios com texto próprio em português (aparecem primeiro).
const CURATED = [
  // ---------- Peito ----------
  ex('supino-reto-barra', 'Supino reto com barra', ['chest'], ['triceps', 'shoulders'], 'Barra', [
    'Deite no banco com os pés firmes no chão e segure a barra um pouco mais aberta que os ombros.',
    'Desça a barra com controle até encostar de leve no meio do peito.',
    'Empurre de volta até estender os braços, sem travar os cotovelos.',
  ]),
  ex('supino-inclinado-halteres', 'Supino inclinado com halteres', ['chest'], ['shoulders', 'triceps'], 'Halteres', [
    'Ajuste o banco entre 30° e 45° e comece com os halteres na altura do peito.',
    'Empurre para cima aproximando os halteres no topo.',
    'Desça devagar até sentir o alongamento no peito.',
  ]),
  ex('crucifixo-halteres', 'Crucifixo com halteres', ['chest'], ['shoulders'], 'Halteres', [
    'Deitado no banco, segure os halteres acima do peito com os cotovelos levemente dobrados.',
    'Abra os braços em arco até a altura do peito.',
    'Volte "abraçando" o ar, mantendo o mesmo ângulo nos cotovelos.',
  ]),
  ex('flexao', 'Flexão de braço', ['chest'], ['triceps', 'shoulders', 'abs'], 'Peso corporal', [
    'Mãos no chão um pouco mais abertas que os ombros, corpo reto da cabeça aos pés.',
    'Desça até o peito quase tocar o chão, cotovelos a uns 45° do corpo.',
    'Empurre o chão para subir. Para facilitar, apoie os joelhos.',
  ]),
  ex('crossover', 'Crossover no cabo', ['chest'], ['shoulders'], 'Cabo', [
    'Polias no alto, um passo à frente, tronco levemente inclinado.',
    'Traga as mãos para baixo e para o centro, cruzando à frente do quadril.',
    'Volte devagar até sentir o peito alongar.',
  ]),
  ex('peck-deck', 'Voador (peck deck)', ['chest'], ['shoulders'], 'Máquina', [
    'Ajuste o banco para as pegadas ficarem na altura do peito.',
    'Feche os braços à frente contraindo o peito.',
    'Abra com controle, sem deixar o peso bater.',
  ]),
  ex('paralelas', 'Mergulho nas paralelas', ['chest', 'triceps'], ['shoulders'], 'Peso corporal', [
    'Apoie-se nas barras com os braços estendidos e o tronco levemente inclinado à frente.',
    'Desça dobrando os cotovelos até os ombros ficarem um pouco abaixo deles.',
    'Empurre para subir. Tronco mais reto foca mais no tríceps.',
  ]),

  // ---------- Ombros ----------
  ex('desenvolvimento-halteres', 'Desenvolvimento com halteres', ['shoulders'], ['triceps'], 'Halteres', [
    'Sentado com as costas apoiadas, halteres na altura das orelhas.',
    'Empurre para cima até quase estender os braços.',
    'Desça devagar de volta à altura das orelhas.',
  ]),
  ex('desenvolvimento-maquina', 'Desenvolvimento na máquina', ['shoulders'], ['triceps'], 'Máquina', [
    'Ajuste o banco para as pegadas ficarem na altura dos ombros.',
    'Empurre para cima sem arquear a lombar.',
    'Volte com controle.',
  ]),
  ex('elevacao-lateral', 'Elevação lateral', ['shoulders'], ['traps'], 'Halteres', [
    'Em pé, halteres ao lado do corpo, cotovelos levemente dobrados.',
    'Eleve os braços para os lados até a altura dos ombros.',
    'Desça devagar. Use carga leve e evite dar impulso.',
  ]),
  ex('elevacao-frontal', 'Elevação frontal', ['shoulders'], [], 'Halteres', [
    'Em pé, halteres à frente das coxas.',
    'Eleve os braços à frente até a altura dos ombros.',
    'Desça com controle, sem balançar o tronco.',
  ]),
  ex('crucifixo-inverso', 'Crucifixo inverso', ['shoulders'], ['traps'], 'Halteres', [
    'Incline o tronco à frente com as costas retas, halteres pendurados.',
    'Abra os braços para os lados apertando as escápulas.',
    'Volte devagar.',
  ]),
  ex('face-pull', 'Face pull', ['shoulders'], ['traps'], 'Cabo', [
    'Polia na altura do rosto, com corda.',
    'Puxe a corda em direção ao rosto abrindo as mãos e os cotovelos para fora.',
    'Segure um instante e volte.',
  ]),

  // ---------- Bíceps ----------
  ex('rosca-direta', 'Rosca direta com barra', ['biceps'], ['forearms'], 'Barra', [
    'Em pé, barra na largura dos ombros, palmas para cima.',
    'Suba a barra dobrando os cotovelos, sem mexer os cotovelos de lugar.',
    'Desça devagar até quase estender.',
  ]),
  ex('rosca-alternada', 'Rosca alternada com halteres', ['biceps'], ['forearms'], 'Halteres', [
    'Em pé, halteres ao lado do corpo.',
    'Suba um braço girando a palma para cima durante o movimento.',
    'Desça e alterne o lado.',
  ]),
  ex('rosca-martelo', 'Rosca martelo', ['biceps', 'forearms'], [], 'Halteres', [
    'Segure os halteres com as palmas viradas para o corpo.',
    'Suba mantendo essa pegada neutra.',
    'Desça com controle.',
  ]),
  ex('rosca-scott', 'Rosca Scott', ['biceps'], [], 'Barra', [
    'Apoie a parte de trás dos braços no banco Scott.',
    'Suba a barra até perto dos ombros.',
    'Desça devagar, sem estender totalmente de forma brusca.',
  ]),
  ex('rosca-cabo', 'Rosca no cabo', ['biceps'], ['forearms'], 'Cabo', [
    'Polia baixa com barra reta ou W.',
    'Suba dobrando os cotovelos colados ao corpo.',
    'Volte devagar mantendo a tensão.',
  ]),

  // ---------- Tríceps ----------
  ex('triceps-pulley', 'Tríceps na polia (barra)', ['triceps'], [], 'Cabo', [
    'Polia alta, cotovelos colados ao corpo.',
    'Empurre a barra para baixo até estender os braços.',
    'Volte até os antebraços ficarem paralelos ao chão.',
  ]),
  ex('triceps-corda', 'Tríceps corda', ['triceps'], [], 'Cabo', [
    'Polia alta com corda, cotovelos fixos ao lado do corpo.',
    'Empurre para baixo abrindo a corda no final.',
    'Volte com controle.',
  ]),
  ex('triceps-testa', 'Tríceps testa', ['triceps'], [], 'Barra', [
    'Deitado, barra acima do peito com os braços estendidos.',
    'Dobre só os cotovelos levando a barra em direção à testa.',
    'Estenda de volta sem abrir os cotovelos.',
  ]),
  ex('triceps-frances', 'Tríceps francês com halter', ['triceps'], [], 'Halteres', [
    'Sentado, segure um halter com as duas mãos acima da cabeça.',
    'Desça o halter atrás da cabeça dobrando os cotovelos.',
    'Estenda os braços de volta.',
  ]),
  ex('mergulho-banco', 'Mergulho no banco', ['triceps'], ['chest', 'shoulders'], 'Peso corporal', [
    'Mãos na borda de um banco atrás de você, pernas à frente.',
    'Desça dobrando os cotovelos até uns 90°.',
    'Empurre para subir.',
  ]),

  // ---------- Antebraço ----------
  ex('rosca-punho', 'Rosca de punho', ['forearms'], [], 'Halteres', [
    'Antebraços apoiados nas coxas, palmas para cima, punhos para fora.',
    'Dobre só os punhos para cima.',
    'Desça devagar.',
  ]),
  ex('farmer-walk', 'Caminhada do fazendeiro', ['forearms'], ['traps', 'abs'], 'Halteres', [
    'Segure halteres pesados ao lado do corpo.',
    'Caminhe com o tronco reto e os ombros para trás.',
    'Ande por um tempo ou distância definidos.',
  ]),

  // ---------- Costas ----------
  ex('barra-fixa', 'Barra fixa', ['lats'], ['biceps', 'forearms'], 'Peso corporal', [
    'Segure a barra com as palmas para frente, um pouco mais aberto que os ombros.',
    'Puxe o corpo até o queixo passar a barra.',
    'Desça devagar até estender os braços. Use elástico ou máquina para ajudar.',
  ]),
  ex('puxada-frente', 'Puxada na frente (pulldown)', ['lats'], ['biceps'], 'Máquina', [
    'Sentado, pegada aberta na barra.',
    'Puxe a barra até a parte de cima do peito, levando os cotovelos para baixo.',
    'Volte com controle até estender os braços.',
  ]),
  ex('remada-curvada', 'Remada curvada com barra', ['lats'], ['traps', 'biceps', 'lowerback'], 'Barra', [
    'Incline o tronco à frente com as costas retas e os joelhos levemente dobrados.',
    'Puxe a barra em direção ao umbigo.',
    'Desça com controle.',
  ]),
  ex('remada-unilateral', 'Remada unilateral com halter', ['lats'], ['biceps', 'traps'], 'Halteres', [
    'Apoie um joelho e uma mão no banco, costas retas.',
    'Puxe o halter em direção ao quadril.',
    'Desça devagar e troque de lado.',
  ]),
  ex('remada-baixa', 'Remada baixa no cabo', ['lats'], ['traps', 'biceps'], 'Cabo', [
    'Sentado, pés apoiados, costas retas.',
    'Puxe a pegada em direção ao abdômen apertando as escápulas.',
    'Volte estendendo os braços sem curvar as costas.',
  ]),
  ex('pullover', 'Pullover com halter', ['lats'], ['chest'], 'Halteres', [
    'Deitado no banco, segure um halter com as duas mãos acima do peito.',
    'Leve o halter para trás da cabeça com os braços quase estendidos.',
    'Volte à posição inicial.',
  ]),
  ex('remada-elastico', 'Remada com elástico', ['lats'], ['biceps'], 'Elástico', [
    'Prenda o elástico à frente na altura do peito.',
    'Puxe levando os cotovelos para trás.',
    'Volte devagar.',
  ]),

  // ---------- Trapézio ----------
  ex('encolhimento', 'Encolhimento com halteres', ['traps'], ['forearms'], 'Halteres', [
    'Em pé, halteres ao lado do corpo.',
    'Suba os ombros em direção às orelhas.',
    'Segure um instante e desça.',
  ]),
  ex('remada-alta', 'Remada alta', ['traps', 'shoulders'], [], 'Barra', [
    'Barra à frente das coxas, pegada na largura dos ombros.',
    'Puxe a barra rente ao corpo até a altura do peito, cotovelos para cima.',
    'Desça com controle.',
  ]),

  // ---------- Lombar ----------
  ex('levantamento-terra', 'Levantamento terra', ['lowerback', 'glutes', 'hamstrings'], ['quads', 'traps', 'forearms'], 'Barra', [
    'Barra perto das canelas, pés na largura do quadril, costas retas.',
    'Suba empurrando o chão com as pernas e estendendo o quadril.',
    'Desça a barra rente às pernas mantendo as costas retas.',
  ]),
  ex('extensao-lombar', 'Extensão lombar (banco romano)', ['lowerback'], ['glutes', 'hamstrings'], 'Peso corporal', [
    'Apoie o quadril no banco com os pés presos.',
    'Desça o tronco com as costas retas.',
    'Suba até alinhar o corpo, sem passar da linha.',
  ]),
  ex('superman', 'Superman', ['lowerback'], ['glutes'], 'Peso corporal', [
    'Deitado de barriga para baixo, braços estendidos à frente.',
    'Eleve braços e pernas ao mesmo tempo.',
    'Segure 2 segundos e desça.',
  ]),

  // ---------- Abdômen ----------
  ex('abdominal-crunch', 'Abdominal crunch', ['abs'], [], 'Peso corporal', [
    'Deitado, joelhos dobrados, mãos ao lado da cabeça.',
    'Suba só os ombros do chão contraindo o abdômen.',
    'Desça devagar sem puxar o pescoço.',
  ]),
  ex('prancha', 'Prancha', ['abs'], ['obliques', 'shoulders'], 'Peso corporal', [
    'Apoie antebraços e pontas dos pés, corpo reto.',
    'Contraia abdômen e glúteos, sem deixar o quadril cair.',
    'Segure pelo tempo definido.',
  ]),
  ex('elevacao-pernas', 'Elevação de pernas', ['abs'], [], 'Peso corporal', [
    'Deitado, pernas estendidas, mãos ao lado do corpo.',
    'Suba as pernas até ficarem verticais.',
    'Desça devagar sem encostar no chão.',
  ]),
  ex('abdominal-bicicleta', 'Abdominal bicicleta', ['abs', 'obliques'], [], 'Peso corporal', [
    'Deitado, mãos ao lado da cabeça, pernas suspensas.',
    'Leve o cotovelo em direção ao joelho oposto enquanto estende a outra perna.',
    'Alterne os lados em ritmo controlado.',
  ]),
  ex('roda-abdominal', 'Roda abdominal', ['abs'], ['lats', 'shoulders'], 'Acessório', [
    'Ajoelhado, segure a roda à frente.',
    'Role para frente mantendo o abdômen firme.',
    'Volte puxando com o abdômen. Vá só até onde controlar.',
  ]),

  // ---------- Oblíquos ----------
  ex('prancha-lateral', 'Prancha lateral', ['obliques'], ['abs'], 'Peso corporal', [
    'De lado, apoie o antebraço e a lateral do pé.',
    'Eleve o quadril deixando o corpo reto.',
    'Segure e troque de lado.',
  ]),
  ex('giro-russo', 'Giro russo', ['obliques'], ['abs'], 'Peso corporal', [
    'Sentado, tronco inclinado para trás, pés no chão ou suspensos.',
    'Gire o tronco levando as mãos de um lado ao outro.',
    'Pode segurar um peso para dificultar.',
  ]),
  ex('lenhador-cabo', 'Lenhador no cabo', ['obliques'], ['abs', 'shoulders'], 'Cabo', [
    'Polia alta ao seu lado, segure com as duas mãos.',
    'Puxe na diagonal até o quadril oposto girando o tronco.',
    'Volte com controle e troque de lado.',
  ]),

  // ---------- Quadríceps ----------
  ex('agachamento-livre', 'Agachamento livre com barra', ['quads', 'glutes'], ['hamstrings', 'lowerback'], 'Barra', [
    'Barra apoiada no trapézio, pés na largura dos ombros.',
    'Desça empurrando o quadril para trás, joelhos na direção dos pés.',
    'Suba empurrando o chão, mantendo o peito aberto.',
  ]),
  ex('agachamento-corpo', 'Agachamento (peso corporal)', ['quads'], ['glutes'], 'Peso corporal', [
    'Pés na largura dos ombros, braços à frente.',
    'Desça como se fosse sentar numa cadeira.',
    'Suba estendendo quadril e joelhos.',
  ]),
  ex('agachamento-goblet', 'Agachamento goblet', ['quads', 'glutes'], ['abs'], 'Halteres', [
    'Segure um halter junto ao peito.',
    'Agache mantendo o tronco ereto.',
    'Suba empurrando o chão.',
  ]),
  ex('leg-press', 'Leg press', ['quads'], ['glutes', 'hamstrings'], 'Máquina', [
    'Pés na plataforma na largura dos ombros.',
    'Desça dobrando os joelhos sem tirar a lombar do encosto.',
    'Empurre sem travar os joelhos no final.',
  ]),
  ex('cadeira-extensora', 'Cadeira extensora', ['quads'], [], 'Máquina', [
    'Ajuste o apoio logo acima dos tornozelos.',
    'Estenda os joelhos até as pernas ficarem retas.',
    'Desça devagar.',
  ]),
  ex('afundo', 'Afundo (passada)', ['quads', 'glutes'], ['hamstrings'], 'Halteres', [
    'Dê um passo largo à frente com halteres ao lado do corpo.',
    'Desça até os dois joelhos ficarem perto de 90°.',
    'Volte e troque de perna.',
  ]),
  ex('agachamento-bulgaro', 'Agachamento búlgaro', ['quads', 'glutes'], ['hamstrings'], 'Halteres', [
    'Pé de trás apoiado num banco, pé da frente bem à frente.',
    'Desça o quadril na vertical.',
    'Suba pela perna da frente e troque de lado.',
  ]),
  ex('hack', 'Agachamento hack', ['quads'], ['glutes'], 'Máquina', [
    'Costas apoiadas na máquina, pés na plataforma.',
    'Desça com controle até uns 90° ou um pouco mais.',
    'Suba empurrando a plataforma.',
  ]),

  // ---------- Posteriores ----------
  ex('stiff', 'Stiff com barra', ['hamstrings'], ['glutes', 'lowerback'], 'Barra', [
    'Em pé com a barra à frente, joelhos levemente dobrados.',
    'Desça a barra rente às pernas levando o quadril para trás, costas retas.',
    'Suba contraindo glúteos e posteriores.',
  ]),
  ex('terra-romeno-halteres', 'Terra romeno com halteres', ['hamstrings', 'glutes'], ['lowerback'], 'Halteres', [
    'Halteres à frente das coxas, joelhos levemente dobrados.',
    'Leve o quadril para trás descendo os halteres até o meio da canela.',
    'Suba estendendo o quadril.',
  ]),
  ex('mesa-flexora', 'Mesa flexora', ['hamstrings'], ['calves'], 'Máquina', [
    'Deitado de bruços, apoio logo acima dos calcanhares.',
    'Dobre os joelhos trazendo o apoio em direção ao glúteo.',
    'Desça devagar.',
  ]),
  ex('cadeira-flexora', 'Cadeira flexora', ['hamstrings'], [], 'Máquina', [
    'Sentado, apoio atrás dos tornozelos.',
    'Dobre os joelhos puxando o apoio para baixo.',
    'Volte com controle.',
  ]),

  // ---------- Glúteos ----------
  ex('elevacao-pelvica', 'Elevação pélvica (hip thrust)', ['glutes'], ['hamstrings'], 'Barra', [
    'Costas apoiadas num banco, barra sobre o quadril (use proteção).',
    'Suba o quadril até alinhar tronco e coxas.',
    'Aperte o glúteo no topo e desça.',
  ]),
  ex('ponte-gluteo', 'Ponte de glúteo', ['glutes'], ['hamstrings'], 'Peso corporal', [
    'Deitado, joelhos dobrados, pés no chão.',
    'Suba o quadril contraindo o glúteo.',
    'Segure 1 segundo e desça.',
  ]),
  ex('coice-cabo', 'Coice no cabo', ['glutes'], ['hamstrings'], 'Cabo', [
    'Tornozeleira na polia baixa, de frente para a máquina.',
    'Leve a perna estendida para trás contraindo o glúteo.',
    'Volte devagar e troque de perna.',
  ]),
  ex('cadeira-abdutora', 'Cadeira abdutora', ['glutes'], [], 'Máquina', [
    'Sentado, apoios do lado de fora dos joelhos.',
    'Abra as pernas contra a resistência.',
    'Feche devagar.',
  ]),
  ex('abducao-elastico', 'Abdução com mini band', ['glutes'], [], 'Elástico', [
    'Mini band acima dos joelhos, semi-agachado.',
    'Dê passos laterais mantendo tensão no elástico.',
    'Faça para os dois lados.',
  ]),
  ex('kettlebell-swing', 'Swing com kettlebell', ['glutes', 'hamstrings'], ['lowerback', 'shoulders'], 'Kettlebell', [
    'Pés um pouco mais abertos que os ombros, kettlebell à frente.',
    'Leve o kettlebell entre as pernas dobrando o quadril.',
    'Estenda o quadril com força, balançando até a altura do peito.',
  ]),

  // ---------- Adutores ----------
  ex('cadeira-adutora', 'Cadeira adutora', ['adductors'], [], 'Máquina', [
    'Sentado, apoios do lado de dentro dos joelhos.',
    'Feche as pernas contra a resistência.',
    'Abra devagar.',
  ]),
  ex('agachamento-sumo', 'Agachamento sumô', ['adductors', 'glutes'], ['quads'], 'Halteres', [
    'Pés bem afastados e virados para fora, halter seguro à frente.',
    'Desça mantendo os joelhos na direção dos pés.',
    'Suba contraindo glúteos e parte interna da coxa.',
  ]),

  // ---------- Panturrilhas ----------
  ex('panturrilha-em-pe', 'Panturrilha em pé', ['calves'], [], 'Máquina', [
    'Pontas dos pés na plataforma, calcanhares para fora.',
    'Suba na ponta dos pés o máximo possível.',
    'Desça até alongar bem a panturrilha.',
  ]),
  ex('panturrilha-sentado', 'Panturrilha sentado', ['calves'], [], 'Máquina', [
    'Sentado, apoio sobre os joelhos, pontas dos pés na plataforma.',
    'Suba os calcanhares.',
    'Desça devagar.',
  ]),
  ex('panturrilha-degrau', 'Panturrilha no degrau', ['calves'], [], 'Peso corporal', [
    'Pontas dos pés na borda de um degrau, segure em algo para equilíbrio.',
    'Suba na ponta dos pés.',
    'Desça abaixo da linha do degrau.',
  ]),
];

// + exercícios importados do free-exercise-db (gerado por `npm run exercises`; passo a passo em inglês).
export const EXERCISES: Exercise[] = [...CURATED, ...(EXTRA as Exercise[])];

export const EXERCISE_BY_ID: Record<string, Exercise | undefined> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
