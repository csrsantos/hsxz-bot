const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  FileUploadBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const db = require('./database');
const { brandEmbed, brandName } = require('./brand');
const { pad, slugify, duration } = require('./validate');

let discordTranscripts = null;
try {
  discordTranscripts = require('discord-html-transcripts');
} catch {
  console.warn('[tickets] discord-html-transcripts não encontrado: tickets serão fechados sem transcript.');
}

const SUPPORTS_MODAL_UPLOAD = Boolean(
  FileUploadBuilder && LabelBuilder && ModalBuilder.prototype.addLabelComponents
);

const MAX_FILES = 5;
const TRANSCRIPT_MAX_BYTES = 9 * 1024 * 1024;
const creating = new Set();
const closing = new Set();

const EPHEMERAL = MessageFlags.Ephemeral;

async function respond(interaction, content) {
  const payload = typeof content === 'string' ? { content } : content;
  try {
    if (interaction.deferred) return await interaction.editReply(payload);
    if (interaction.replied) return await interaction.followUp({ flags: EPHEMERAL, ...payload });
    return await interaction.reply({ flags: EPHEMERAL, ...payload });
  } catch (err) {
    console.error('[respond]', err.message);
  }
}

function isStaff(member, cfg) {
  if (!member) return false;
  if (member.permissions && member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return Boolean(cfg.staffRoleId && member.roles && member.roles.cache && member.roles.cache.has(cfg.staffRoleId));
}

async function sendLog(guild, cfg, payload) {
  if (!cfg.logsChannelId) return;
  const ch = guild.channels.cache.get(cfg.logsChannelId) || (await guild.channels.fetch(cfg.logsChannelId).catch(() => null));
  if (ch && ch.isTextBased()) await ch.send(payload).catch((e) => console.error('[logs]', e.message));
}

function controlRow(claimedName) {
  return new ActionRowBuilder().addComponents(
    claimedName
      ? new ButtonBuilder()
          .setCustomId('ticket:claim')
          .setLabel(`Assumido por ${claimedName}`.slice(0, 80))
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true)
      : new ButtonBuilder().setCustomId('ticket:claim').setLabel('Assumir').setEmoji('👋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
}

function panelPayload(cfg) {
  const p = cfg.panel;
  const embed = brandEmbed(cfg, { title: p.title, description: p.description, footer: p.footer });
  if (p.image) embed.setImage(p.image);
  const button = new ButtonBuilder().setCustomId('ticket:open').setLabel(p.buttonLabel || 'Abrir Ticket').setStyle(ButtonStyle.Primary);
  try { if (p.buttonEmoji) button.setEmoji(p.buttonEmoji); } catch { /* emoji inválido: botão sem emoji */ }
  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] };
}

function typeOption(type) {
  const o = new StringSelectMenuOptionBuilder().setLabel(type.label.slice(0, 100)).setValue(type.id);
  if (type.description) o.setDescription(type.description.slice(0, 100));
  try { if (type.emoji) o.setEmoji(type.emoji); } catch { /* sem emoji */ }
  return o;
}

function buildModal(type, withUpload) {
  const modal = new ModalBuilder().setCustomId(`ticket:modal:${type.id}`).setTitle(type.label.slice(0, 45));

  const subject = new TextInputBuilder()
    .setCustomId('subject')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: Meu pedido #123 não chegou')
    .setRequired(true)
    .setMaxLength(100);
  const description = new TextInputBuilder()
    .setCustomId('description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Explique com o máximo de detalhes possível...')
    .setRequired(true)
    .setMaxLength(1000);

  if (withUpload) {
    const upload = new FileUploadBuilder().setCustomId('anexos').setMinValues(0).setMaxValues(MAX_FILES).setRequired(false);
    modal.addLabelComponents(
      new LabelBuilder().setLabel('Assunto').setTextInputComponent(subject),
      new LabelBuilder().setLabel('Descrição detalhada').setTextInputComponent(description),
      new LabelBuilder()
        .setLabel('Anexos (opcional)')
        .setDescription(`Prints, vídeos ou documentos (até ${MAX_FILES} arquivos)`)
        .setFileUploadComponent(upload)
    );
  } else {
    subject.setLabel('Assunto');
    description.setLabel('Descrição detalhada');
    modal.addComponents(new ActionRowBuilder().addComponents(subject), new ActionRowBuilder().addComponents(description));
  }
  return modal;
}

async function showTicketModal(interaction, type) {
  if (SUPPORTS_MODAL_UPLOAD) {
    try {
      return await interaction.showModal(buildModal(type, true));
    } catch (err) {
      console.warn('[tickets] Formulário com anexos recusado, usando o simples:', err.message);
    }
  }
  return interaction.showModal(buildModal(type, false));
}

async function handleOpen(interaction) {
  const cfg = db.getGuild(interaction.guild.id);
  if (!cfg.ticketCategoryId || !cfg.staffRoleId) {
    return respond(interaction, '❌ O atendimento ainda não foi configurado. Peça a um administrador para usar `/config`.');
  }
  if (!cfg.ticketTypes.length) return respond(interaction, '❌ Nenhum tipo de ticket cadastrado.');
  if (db.countOpen(interaction.guild.id, interaction.user.id) >= cfg.maxTicketsPerUser) {
    return respond(interaction, `⚠️ Você já tem ${cfg.maxTicketsPerUser} ticket(s) aberto(s). Conclua um antes de abrir outro.`);
  }
  if (cfg.ticketTypes.length === 1) return showTicketModal(interaction, cfg.ticketTypes[0]);

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket:type')
    .setPlaceholder('Escolha o tipo de atendimento')
    .addOptions(cfg.ticketTypes.slice(0, 25).map(typeOption));
  return interaction.reply({
    content: 'Selecione o tipo de atendimento:',
    components: [new ActionRowBuilder().addComponents(menu)],
    flags: EPHEMERAL
  });
}

async function handleTypeSelect(interaction) {
  const cfg = db.getGuild(interaction.guild.id);
  const type = cfg.ticketTypes.find((t) => t.id === interaction.values[0]);
  if (!type) return respond(interaction, '❌ Tipo de ticket inválido.');
  return showTicketModal(interaction, type);
}

async function handleModalSubmit(interaction) {
  await interaction.deferReply({ flags: EPHEMERAL });
  const cfg = db.getGuild(interaction.guild.id);
  const typeId = interaction.customId.slice('ticket:modal:'.length);
  const type = cfg.ticketTypes.find((t) => t.id === typeId);
  if (!type) return respond(interaction, '❌ Tipo de ticket inválido.');

  const subject = interaction.fields.getTextInputValue('subject').trim();
  const description = interaction.fields.getTextInputValue('description').trim();

  let files = [];
  try {
    const col = interaction.fields.getUploadedFiles('anexos');
    if (col) files = [...col.values()].slice(0, MAX_FILES);
  } catch { /* formulário simples ou sem arquivos */ }

  return createTicket(interaction, cfg, type, subject, description, files);
}

function ticketEmbed(cfg, ticket, user, type, description, files, asLinks) {
  const e = brandEmbed(cfg, {
    title: `${type.emoji || '🎫'} Ticket #${pad(ticket.id)} • ${type.label}`,
    description: `**Descrição**\n${description}`,
    footer: `${brandName(cfg)} • Ticket #${pad(ticket.id)}`
  }).addFields(
    { name: 'Cliente', value: `${user}`, inline: true },
    { name: 'Assunto', value: ticket.subject, inline: true }
  );
  if (files.length) {
    const lista = asLinks
      ? files.map((f) => `[${f.name}](${f.url})`).join('\n')
      : files.map((f) => `• ${f.name}`).join('\n');
    e.addFields({ name: `📎 Anexos (${files.length})`, value: lista.slice(0, 1000) });
  }
  e.addFields({
    name: '📎 Mais arquivos?',
    value: 'É só enviar neste canal: prints, vídeos e documentos podem ser anexados normalmente.'
  });
  return e;
}

async function createTicket(interaction, cfg, type, subject, description, files) {
  const { guild, user } = interaction;
  const lockKey = `${guild.id}:${user.id}`;
  if (creating.has(lockKey)) return respond(interaction, '⏳ Seu ticket já está sendo criado, aguarde um instante.');
  creating.add(lockKey);

  try {
    if (db.countOpen(guild.id, user.id) >= cfg.maxTicketsPerUser) {
      return respond(interaction, `⚠️ Você já tem ${cfg.maxTicketsPerUser} ticket(s) aberto(s).`);
    }
    const category = guild.channels.cache.get(cfg.ticketCategoryId) || (await guild.channels.fetch(cfg.ticketCategoryId).catch(() => null));
    const staffRole = guild.roles.cache.get(cfg.staffRoleId) || (await guild.roles.fetch(cfg.staffRoleId).catch(() => null));
    if (!category || !staffRole) {
      return respond(interaction, '❌ A categoria ou o cargo da staff não existe mais. Avise um administrador.');
    }

    const number = db.nextNumber(guild.id);
    const userPerms = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ReadMessageHistory
    ];

    let channel;
    try {
      channel = await guild.channels.create({
        name: `ticket-${pad(number)}-${slugify(user.username) || 'cliente'}`,
        type: ChannelType.GuildText,
        parent: category.id,
        topic: `Ticket #${pad(number)} • ${type.label} • Cliente: ${user.tag}`,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: userPerms },
          { id: staffRole.id, allow: [...userPerms, PermissionFlagsBits.ManageMessages] },
          {
            id: interaction.client.user.id,
            allow: [...userPerms, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]
          }
        ],
        reason: `Ticket #${pad(number)} aberto por ${user.tag}`
      });
    } catch (err) {
      console.error('[tickets] Falha ao criar canal:', err);
      return respond(interaction, '❌ Não consegui criar o canal. Avise a staff (verifique as permissões do bot e o limite de canais da categoria).');
    }

    const ticket = {
      id: number,
      channelId: channel.id,
      userId: user.id,
      userTag: user.tag,
      typeId: type.id,
      typeLabel: type.label,
      subject,
      status: 'open',
      claimedBy: null,
      claimedByName: null,
      createdAt: Date.now()
    };
    db.addTicket(guild.id, ticket);

    const base = {
      content: `${user} ${staffRole}`,
      components: [controlRow(null)],
      allowedMentions: { users: [user.id], roles: [staffRole.id] }
    };
    if (files.length) {
      try {
        await channel.send({
          ...base,
          embeds: [ticketEmbed(cfg, ticket, user, type, description, files, false)],
          files: files.map((f) => new AttachmentBuilder(f.url, { name: f.name }))
        });
      } catch (err) {
        console.error('[tickets] Falha ao reenviar anexos, enviando links:', err.message);
        await channel.send({ ...base, embeds: [ticketEmbed(cfg, ticket, user, type, description, files, true)] });
      }
    } else {
      await channel.send({ ...base, embeds: [ticketEmbed(cfg, ticket, user, type, description, [], false)] });
    }

    await sendLog(guild, cfg, {
      embeds: [
        brandEmbed(cfg, { title: `📥 Ticket #${pad(number)} aberto`, color: '#57F287' }).addFields(
          { name: 'Cliente', value: `${user} (${user.id})`, inline: true },
          { name: 'Tipo', value: type.label, inline: true },
          { name: 'Canal', value: `${channel}`, inline: true },
          { name: 'Assunto', value: subject },
          { name: 'Anexos no formulário', value: files.length ? `${files.length} arquivo(s)` : 'Nenhum', inline: true }
        )
      ]
    });

    return respond(interaction, `✅ Ticket criado! Acesse ${channel}`);
  } finally {
    creating.delete(lockKey);
  }
}

async function handleClaim(interaction) {
  const { guild, channel, user, member } = interaction;
  const cfg = db.getGuild(guild.id);
  const ticket = db.getTicket(guild.id, channel.id);
  if (!ticket || ticket.status !== 'open') return respond(interaction, '❌ Este canal não é um ticket aberto.');
  if (!isStaff(member, cfg)) return respond(interaction, '❌ Apenas a staff pode assumir tickets.');
  if (ticket.claimedBy && ticket.claimedBy !== user.id) {
    return respond(interaction, `⚠️ Este ticket já foi assumido por <@${ticket.claimedBy}>.`);
  }

  db.setClaim(guild.id, channel.id, user.id, user.username);
  await interaction.update({ components: [controlRow(user.username)] });
  await channel.send({
    embeds: [brandEmbed(cfg, { description: `👋 Ticket assumido por ${user}. <@${ticket.userId}>, a partir de agora você será atendido por ele(a).`, color: '#57F287' })],
    allowedMentions: { users: [ticket.userId] }
  });
  await sendLog(guild, cfg, {
    embeds: [brandEmbed(cfg, { title: `👋 Ticket #${pad(ticket.id)} assumido`, description: `Por ${user} em ${channel}`, color: '#FEE75C' })]
  });
}

async function handleCloseButton(interaction) {
  const { guild, channel, user, member } = interaction;
  const cfg = db.getGuild(guild.id);
  const ticket = db.getTicket(guild.id, channel.id);
  if (!ticket || ticket.status !== 'open') return respond(interaction, '❌ Este canal não é um ticket aberto.');
  if (!isStaff(member, cfg) && ticket.userId !== user.id) {
    return respond(interaction, '❌ Só a staff ou quem abriu o ticket pode fechá-lo.');
  }
  const modal = new ModalBuilder().setCustomId('ticket:closemodal').setTitle('Fechar ticket');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Motivo (opcional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(300)
        .setPlaceholder('Ex: Problema resolvido')
    )
  );
  return interaction.showModal(modal);
}

async function handleCloseSubmit(interaction) {
  const { guild, channel, user, member } = interaction;
  const cfg = db.getGuild(guild.id);
  const ticket = db.getTicket(guild.id, channel.id);
  if (!ticket || ticket.status !== 'open') return respond(interaction, '❌ Este canal não é um ticket aberto.');
  if (!isStaff(member, cfg) && ticket.userId !== user.id) return respond(interaction, '❌ Sem permissão.');
  if (closing.has(channel.id)) return respond(interaction, '⏳ Este ticket já está sendo fechado.');
  closing.add(channel.id);

  const reason = (interaction.fields.getTextInputValue('reason') || '').trim() || 'Não informado';
  await interaction.reply({
    embeds: [brandEmbed(cfg, {
      title: '🔒 Fechando ticket',
      description: 'Salvando o histórico e fechando o canal em 5 segundos...' +
        (cfg.logsChannelId ? '' : '\n⚠️ Nenhum canal de logs configurado: o histórico não será guardado.'),
      color: '#ED4245'
    })]
  });

  db.closeTicket(guild.id, channel.id, { closedBy: user.id, closedByTag: user.tag, reason });

  let transcript = null;
  if (discordTranscripts && cfg.logsChannelId) {
    const filename = `transcript-ticket-${pad(ticket.id)}.html`;
    try {
      transcript = await discordTranscripts.createTranscript(channel, {
        limit: -1, returnType: 'attachment', filename, saveImages: true, poweredBy: false
      });
      if (Buffer.isBuffer(transcript.attachment) && transcript.attachment.length > TRANSCRIPT_MAX_BYTES) {
        transcript = await discordTranscripts.createTranscript(channel, {
          limit: -1, returnType: 'attachment', filename, saveImages: false, poweredBy: false
        });
      }
    } catch (err) {
      console.error('[tickets] Erro ao gerar transcript:', err);
      transcript = null;
    }
  }

  const logEmbed = brandEmbed(cfg, { title: `🔒 Ticket #${pad(ticket.id)} fechado`, color: '#ED4245' }).addFields(
    { name: 'Cliente', value: `<@${ticket.userId}>`, inline: true },
    { name: 'Tipo', value: ticket.typeLabel, inline: true },
    { name: 'Duração', value: duration(Date.now() - ticket.createdAt), inline: true },
    { name: 'Assumido por', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : '—', inline: true },
    { name: 'Fechado por', value: `${user}`, inline: true },
    { name: 'Assunto', value: ticket.subject },
    { name: 'Motivo', value: reason },
    { name: 'Transcript', value: transcript ? 'Anexado abaixo' : 'Indisponível' }
  );
  await sendLog(guild, cfg, { embeds: [logEmbed], ...(transcript ? { files: [transcript] } : {}) });

  const owner = await interaction.client.users.fetch(ticket.userId).catch(() => null);
  if (owner) {
    await owner.send({
      embeds: [brandEmbed(cfg, {
        title: `✅ Seu ticket #${pad(ticket.id)} foi encerrado`,
        description: `**Assunto:** ${ticket.subject}\n**Motivo:** ${reason}\n\nPrecisou de mais ajuda? É só abrir um novo ticket no servidor.`,
        color: '#57F287'
      })]
    }).catch(() => {});
  }

  setTimeout(() => {
    channel.delete(`Ticket #${pad(ticket.id)} fechado por ${user.tag}`).catch(() => {}).finally(() => closing.delete(channel.id));
  }, 5000);
}

module.exports = {
  respond, isStaff, sendLog, panelPayload,
  handleOpen, handleTypeSelect, handleModalSubmit, handleClaim, handleCloseButton, handleCloseSubmit,
  SUPPORTS_MODAL_UPLOAD
};
