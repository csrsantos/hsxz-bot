const { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');
const { brandEmbed } = require('../utils/brand');
const { parseColor, parseEmoji, isHttpUrl, slugify } = require('../utils/validate');

const MAX_TYPES = 25;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configura o atendimento (apenas administradores)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s.setName('categoria').setDescription('Categoria onde os tickets são criados')
        .addChannelOption((o) => o.setName('categoria').setDescription('Categoria').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('staff').setDescription('Cargo da equipe de suporte')
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo da staff').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('logs').setDescription('Canal de logs e transcripts')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal de logs').addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('max').setDescription('Quantos tickets cada pessoa pode ter abertos')
        .addIntegerOption((o) => o.setName('quantidade').setDescription('1 a 10').setMinValue(1).setMaxValue(10).setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('marca').setDescription('Nome da loja exibido nos embeds')
        .addStringOption((o) => o.setName('nome').setDescription('Ex: HSXZ Solutions').setMaxLength(50).setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('painel').setDescription('Personaliza o painel de tickets')
        .addStringOption((o) => o.setName('titulo').setDescription('Título do painel').setMaxLength(200))
        .addStringOption((o) => o.setName('descricao').setDescription('Descrição (use \\n para pular linha)').setMaxLength(1500))
        .addStringOption((o) => o.setName('cor').setDescription('Cor em hexadecimal (ex: #5865F2)'))
        .addStringOption((o) => o.setName('botao').setDescription('Texto do botão').setMaxLength(80))
        .addStringOption((o) => o.setName('emoji').setDescription('Emoji do botão (um só)'))
        .addStringOption((o) => o.setName('footer').setDescription('Texto do rodapé').setMaxLength(200))
        .addStringOption((o) => o.setName('imagem').setDescription('URL de uma imagem/banner (use "-" para remover)'))
    )
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra a configuração atual'))
    .addSubcommandGroup((g) =>
      g.setName('tipo').setDescription('Tipos de ticket que o cliente pode escolher')
        .addSubcommand((s) =>
          s.setName('adicionar').setDescription('Adiciona um tipo de ticket')
            .addStringOption((o) => o.setName('nome').setDescription('Ex: Reembolso').setMaxLength(100).setRequired(true))
            .addStringOption((o) => o.setName('emoji').setDescription('Emoji (um só)').setRequired(true))
            .addStringOption((o) => o.setName('descricao').setDescription('Texto curto abaixo do nome').setMaxLength(100))
        )
        .addSubcommand((s) =>
          s.setName('remover').setDescription('Remove um tipo de ticket')
            .addStringOption((o) => o.setName('tipo').setDescription('Tipo a remover').setAutocomplete(true).setRequired(true))
        )
        .addSubcommand((s) => s.setName('listar').setDescription('Lista os tipos de ticket'))
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const cfg = db.getGuild(interaction.guild.id);
    await interaction.respond(
      cfg.ticketTypes
        .filter((t) => t.label.toLowerCase().includes(focused))
        .slice(0, 25)
        .map((t) => ({ name: t.label.slice(0, 100), value: t.id }))
    );
  },

  async execute(interaction) {
    const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
    const guildId = interaction.guild.id;
    const cfg = db.getGuild(guildId);
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (group === 'tipo') {
      if (sub === 'listar') {
        const lista = cfg.ticketTypes.map((t) => `${t.emoji} **${t.label}**${t.description ? ` — ${t.description}` : ''}`).join('\n');
        return interaction.reply({
          embeds: [brandEmbed(cfg, { title: '🎫 Tipos de ticket', description: lista || 'Nenhum tipo cadastrado.' })],
          flags: MessageFlags.Ephemeral
        });
      }
      if (sub === 'adicionar') {
        if (cfg.ticketTypes.length >= MAX_TYPES) return reply(`❌ Limite de ${MAX_TYPES} tipos atingido.`);
        const nome = interaction.options.getString('nome').trim();
        const emoji = parseEmoji(interaction.options.getString('emoji'));
        if (!emoji) return reply('❌ Emoji inválido. Envie **um** emoji, ex: 🛒');
        const base = slugify(nome, 30) || 'tipo';
        let id = base;
        for (let i = 2; cfg.ticketTypes.some((t) => t.id === id); i++) id = `${base}-${i}`;
        const description = (interaction.options.getString('descricao') || '').trim();
        db.update(guildId, (g) => g.ticketTypes.push({ id, label: nome, emoji, description }));
        return reply(`✅ Tipo **${nome}** adicionado.`);
      }
      if (sub === 'remover') {
        const id = interaction.options.getString('tipo');
        const type = cfg.ticketTypes.find((t) => t.id === id);
        if (!type) return reply('❌ Tipo não encontrado.');
        if (cfg.ticketTypes.length <= 1) return reply('❌ Precisa sobrar pelo menos um tipo de ticket.');
        db.update(guildId, (g) => { g.ticketTypes = g.ticketTypes.filter((t) => t.id !== id); });
        return reply(`✅ Tipo **${type.label}** removido.`);
      }
    }

    if (sub === 'categoria') {
      const c = interaction.options.getChannel('categoria');
      db.update(guildId, (g) => { g.ticketCategoryId = c.id; });
      return reply(`✅ Categoria dos tickets: **${c.name}**`);
    }
    if (sub === 'staff') {
      const r = interaction.options.getRole('cargo');
      db.update(guildId, (g) => { g.staffRoleId = r.id; });
      return reply(`✅ Cargo da staff: **${r.name}**`);
    }
    if (sub === 'logs') {
      const c = interaction.options.getChannel('canal');
      db.update(guildId, (g) => { g.logsChannelId = c.id; });
      return reply(`✅ Canal de logs: ${c}`);
    }
    if (sub === 'max') {
      const n = interaction.options.getInteger('quantidade');
      db.update(guildId, (g) => { g.maxTicketsPerUser = n; });
      return reply(`✅ Limite por pessoa: **${n}** ticket(s) aberto(s).`);
    }
    if (sub === 'marca') {
      const nome = interaction.options.getString('nome').trim();
      db.update(guildId, (g) => { g.brand = nome; });
      return reply(`✅ Nome da loja: **${nome}**. Use \`/config painel footer\` para trocar também o rodapé do painel.`);
    }

    if (sub === 'painel') {
      const o = interaction.options;
      const novo = { ...cfg.panel };
      const erros = [];

      if (o.getString('titulo')) novo.title = o.getString('titulo');
      if (o.getString('descricao')) novo.description = o.getString('descricao').replace(/\\n/g, '\n');
      if (o.getString('botao')) novo.buttonLabel = o.getString('botao');
      if (o.getString('footer')) novo.footer = o.getString('footer');

      if (o.getString('cor')) {
        const cor = parseColor(o.getString('cor'));
        if (cor) novo.color = cor; else erros.push('cor inválida (use 6 dígitos, ex: `#5865F2`)');
      }
      if (o.getString('emoji')) {
        const emoji = parseEmoji(o.getString('emoji'));
        if (emoji) novo.buttonEmoji = emoji; else erros.push('emoji inválido (envie um só, ex: 📩)');
      }
      if (o.getString('imagem')) {
        const url = o.getString('imagem').trim();
        if (url === '-') novo.image = null;
        else if (isHttpUrl(url)) novo.image = url;
        else erros.push('imagem inválida (precisa ser uma URL http/https)');
      }

      db.update(guildId, (g) => { g.panel = novo; });
      const aviso = erros.length ? `\n⚠️ Ignorado: ${erros.join('; ')}.` : '';
      return reply(`✅ Painel atualizado. Use \`/painel\` para enviar o novo.${aviso}`);
    }

    if (sub === 'ver') {
      const c = (id, fmt) => (id ? fmt(id) : '❌ Não configurado');
      const embed = brandEmbed(cfg, { title: '⚙️ Configuração atual' }).addFields(
        { name: 'Loja', value: cfg.brand, inline: true },
        { name: 'Categoria', value: c(cfg.ticketCategoryId, (i) => `<#${i}>`), inline: true },
        { name: 'Cargo da staff', value: c(cfg.staffRoleId, (i) => `<@&${i}>`), inline: true },
        { name: 'Canal de logs', value: c(cfg.logsChannelId, (i) => `<#${i}>`), inline: true },
        { name: 'Máx. tickets por pessoa', value: String(cfg.maxTicketsPerUser), inline: true },
        { name: 'Tipos de ticket', value: String(cfg.ticketTypes.length), inline: true },
        { name: 'Painel', value: `**Título:** ${cfg.panel.title}\n**Botão:** ${cfg.panel.buttonEmoji || ''} ${cfg.panel.buttonLabel}\n**Cor:** ${cfg.panel.color}` }
      );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};
