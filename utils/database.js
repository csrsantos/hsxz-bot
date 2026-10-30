const fs = require('fs');
const path = require('path');

const dir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const file = path.join(dir, 'guilds.json');
let cache = null;

function defaults() {
  return {
    brand: 'HSXZ Solutions',
    ticketCategoryId: null,
    staffRoleId: null,
    logsChannelId: null,
    maxTicketsPerUser: 2,
    counter: 0,
    panel: {
      title: '🎫 Central de Atendimento • HSXZ Solutions',
      description:
        'Precisa de ajuda com uma compra ou com um produto?\nClique no botão abaixo para abrir um ticket.\n\n' +
        'A equipe **HSXZ Solutions** responde o mais rápido possível!',
      color: '#5865F2',
      footer: 'HSXZ Solutions • Sistema de Atendimento',
      buttonLabel: 'Abrir Ticket',
      buttonEmoji: '📩',
      image: null
    },
    ticketTypes: [
      { id: 'suporte', label: 'Suporte', emoji: '🛠️', description: 'Dúvidas e ajuda geral' },
      { id: 'compra', label: 'Dúvida sobre compra', emoji: '🛒', description: 'Pedido, pagamento ou entrega' },
      { id: 'produto', label: 'Problema com produto', emoji: '⚠️', description: 'Algo não funcionou como esperado' },
      { id: 'parceria', label: 'Parceria', emoji: '🤝', description: 'Propostas de parceria' }
    ],
    tickets: {}
  };
}

function load() {
  if (cache) return cache;
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) {
    cache = {};
    return cache;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('formato inválido');
    cache = parsed;
  } catch (err) {
    const backup = `${file}.corrupt-${Date.now()}`;
    try { fs.renameSync(file, backup); } catch { /* ignora */ }
    console.error(`[database] guilds.json corrompido (${err.message}). Backup em ${backup}. Começando vazio.`);
    cache = {};
  }
  return cache;
}

function save() {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, file);
}

function getGuild(guildId) {
  const db = load();
  const d = defaults();
  if (!db[guildId]) {
    db[guildId] = d;
    save();
    return db[guildId];
  }
  const g = db[guildId];
  let changed = false;
  for (const k of Object.keys(d)) {
    if (g[k] === undefined) { g[k] = d[k]; changed = true; }
  }
  for (const k of Object.keys(d.panel)) {
    if (g.panel[k] === undefined) { g.panel[k] = d.panel[k]; changed = true; }
  }
  if (changed) save();
  return g;
}

/** Altera o servidor dentro de fn e grava. */
function update(guildId, fn) {
  const g = getGuild(guildId);
  fn(g);
  save();
  return g;
}

function nextNumber(guildId) {
  let n = 0;
  update(guildId, (g) => { g.counter = (g.counter || 0) + 1; n = g.counter; });
  return n;
}

function addTicket(guildId, ticket) {
  update(guildId, (g) => { g.tickets[ticket.channelId] = ticket; });
}

function getTicket(guildId, channelId) {
  return getGuild(guildId).tickets[channelId] || null;
}

function countOpen(guildId, userId) {
  return Object.values(getGuild(guildId).tickets).filter((t) => t.status === 'open' && t.userId === userId).length;
}

function setClaim(guildId, channelId, userId, userName) {
  update(guildId, (g) => {
    const t = g.tickets[channelId];
    if (t) { t.claimedBy = userId; t.claimedByName = userName; }
  });
}

function closeTicket(guildId, channelId, info) {
  update(guildId, (g) => {
    const t = g.tickets[channelId];
    if (!t || t.status === 'closed') return;
    Object.assign(t, info, { status: 'closed', closedAt: Date.now() });
    const closed = Object.values(g.tickets).filter((x) => x.status === 'closed').sort((a, b) => a.closedAt - b.closedAt);
    while (closed.length > 200) delete g.tickets[closed.shift().channelId];
  });
}

function _reset() { cache = null; }

module.exports = {
  getGuild, update, nextNumber, addTicket, getTicket, countOpen, setClaim, closeTicket, _reset, file
};
