const { ActivityType, Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ HSXZ Solutions • Tickets online como ${client.user.tag}`);
    client.user.setActivity('HSXZ Solutions • Atendimento', { type: ActivityType.Watching });
  }
};
