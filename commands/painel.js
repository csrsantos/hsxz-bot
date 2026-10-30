const { ChannelType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');
const { panelPayload } = require('../utils/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Envia o painel de tickets')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption((o) =>
      o.setName('canal').setDescription('Canal onde enviar (padrão: o atual)').addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    const cfg = db.getGuild(interaction.guild.id);
    if (!cfg.ticketCategoryId || !cfg.staffRoleId) {
      return interaction.reply({
        content: '❌ Configure primeiro a **categoria** e o **cargo da staff** com `/config`.',
        flags: MessageFlags.Ephemeral
      });
    }
    const canal = interaction.options.getChannel('canal') || interaction.channel;
    try {
      await canal.send(panelPayload(cfg));
    } catch {
      return interaction.reply({ content: `❌ Não consigo enviar mensagens em ${canal}.`, flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content: `✅ Painel enviado em ${canal}!`, flags: MessageFlags.Ephemeral });
  }
};
