import { readFile, writeFile } from 'node:fs/promises';

const leagueSlug = 'familia-do-cartola-pt2';
const token = process.env.CARTOLA_TOKEN;

if (!token) {
  throw new Error('Defina o Secret CARTOLA_TOKEN antes de executar a sincronização.');
}

const response = await fetch(`https://api.cartolafc.globo.com/auth/liga/${leagueSlug}`, {
  headers: { 'X-GLB-Token': token, Accept: 'application/json' }
});

if (!response.ok) {
  throw new Error(`O Cartola não autorizou a consulta da liga (${response.status}).`);
}

const source = await response.json();
const teams = source.times ?? source.liga?.times;
if (!Array.isArray(teams)) {
  throw new Error('O Cartola retornou um formato de liga inesperado. Nenhuma alteração foi feita.');
}

const members = {
  Rian: 'Fã Clube do Léo Ortiz',
  Gian: 'City BBMA',
  Lucas: 'E-Sports BA',
  Fernando: 'Fernandão',
  Miguel: 'Iovim FC',
  Sellyda: 'Céu Tricolor FC'
};

function teamName(team) {
  return team.nome ?? team.nome_time ?? team.time?.nome ?? '';
}

function roundScore(team) {
  const score = team.pontos_rodada ?? team.pontos_ultima_rodada ?? team.time?.pontos_rodada;
  return Number.isFinite(Number(score)) ? Number(score) : null;
}

const round = {};
for (const [member, cartolaName] of Object.entries(members)) {
  const team = teams.find(item => teamName(item).trim().toLocaleLowerCase('pt-BR') === cartolaName.toLocaleLowerCase('pt-BR'));
  const score = team && roundScore(team);
  if (score === null || score === undefined) {
    throw new Error(`Não encontrei a pontuação da rodada para ${cartolaName}. Nenhuma alteração foi feita.`);
  }
  round[member] = score;
}

const dataPath = new URL('../data/league.json', import.meta.url);
const data = JSON.parse(await readFile(dataPath, 'utf8'));
const currentRound = Number(source.rodada_atual ?? source.liga?.rodada_atual ?? data.rodadas.length + 1);

if (Number.isInteger(currentRound) && currentRound > 0 && currentRound <= data.rodadas.length) {
  data.rodadas[currentRound - 1] = round;
} else {
  data.rodadas.push(round);
}

data.updatedAt = new Date().toISOString();
await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Dados da rodada ${currentRound} atualizados.`);
