const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');
const { isStaff } = require('../utils/tickets');

const PERMS = {
  ViewChannel: true,
  SendMessages: true,
  AttachFiles: true,
  EmbedLinks: true,
  ReadMessageHistory: true
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ferramentas da staff dentro de um ticket')
    .setDMPermission(false)
    .addSubcommand((s) =>
      s.setName('adicionar').setDescription('Adiciona uma pessoa ao ticket')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem adicionar').setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName('remover').setDescription('Remove uma pessoa do ticket')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem remover').setRequired(true))
    ),

  async execute(interaction) {
    const reply = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral });
    const cfg = db.getGuild(interaction.guild.id);
    if (!isStaff(interaction.member, cfg)) return reply('❌ Apenas a staff pode usar este comando.');

    const ticket = db.getTicket(interaction.guild.id, interaction.channel.id);
    if (!ticket || ticket.status !== 'open') return reply('❌ Use este comando dentro de um ticket aberto.');

    const user = interaction.options.getUser('usuario');
    if (user.bot) return reply('❌ Não dá para usar com bots.');
    if (user.id === ticket.userId) return reply('❌ Esta é a pessoa que abriu o ticket.');

    if (interaction.options.getSubcommand() === 'adicionar') {
      await interaction.channel.permissionOverwrites.edit(user.id, PERMS);
      return interaction.reply({ content: `✅ ${user} foi adicionado(a) ao ticket.`, allowedMentions: { users: [user.id] } });
    }
    await interaction.channel.permissionOverwrites.delete(user.id);
    return interaction.reply({ content: `✅ ${user} foi removido(a) do ticket.`, allowedMentions: { parse: [] } });
  }
};
