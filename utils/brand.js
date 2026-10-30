const { EmbedBuilder } = require('discord.js');
const { toColorInt } = require('./validate');

function brandName(cfg) {
  return cfg.brand || 'HSXZ Solutions';
}

/** Embed padrão com a marca da loja. */
function brandEmbed(cfg, { title, description, color, footer } = {}) {
  const e = new EmbedBuilder()
    .setColor(toColorInt(color || (cfg.panel && cfg.panel.color)))
    .setFooter({ text: footer || `${brandName(cfg)} • Sistema de Atendimento` })
    .setTimestamp();
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

module.exports = { brandName, brandEmbed };
