const { Events } = require('discord.js');
const db = require('../utils/database');

module.exports = {
  name: Events.ChannelDelete,
  execute(channel) {
    if (!channel.guild) return;
    const ticket = db.getTicket(channel.guild.id, channel.id);
    if (ticket && ticket.status === 'open') {
      db.closeTicket(channel.guild.id, channel.id, { reason: 'Canal apagado manualmente', closedBy: null });
      console.log(`[tickets] Canal do ticket #${ticket.id} apagado manualmente.`);
    }
  }
};
