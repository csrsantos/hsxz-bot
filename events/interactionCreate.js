const { Events, MessageFlags } = require('discord.js');
const T = require('../utils/tickets');

async function route(interaction, client) {
  if (!interaction.guild) {
    if (interaction.isRepliable()) {
      await interaction.reply({ content: 'Use este bot dentro de um servidor.', flags: MessageFlags.Ephemeral });
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (command && command.autocomplete) await command.autocomplete(interaction);
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (command) await command.execute(interaction, client);
    return;
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'ticket:open') return T.handleOpen(interaction);
    if (interaction.customId === 'ticket:claim') return T.handleClaim(interaction);
    if (interaction.customId === 'ticket:close') return T.handleCloseButton(interaction);
    return;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:type') {
    return T.handleTypeSelect(interaction);
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('ticket:modal:')) return T.handleModalSubmit(interaction);
    if (interaction.customId === 'ticket:closemodal') return T.handleCloseSubmit(interaction);
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      await route(interaction, client);
    } catch (err) {
      console.error('[interaction]', err);
      if (interaction.isRepliable && interaction.isRepliable()) {
        await T.respond(interaction, '❌ Ocorreu um erro. Tente novamente ou avise a staff.');
      }
    }
  }
};
