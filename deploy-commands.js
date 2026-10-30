require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Preencha TOKEN e CLIENT_ID no .env');
  process.exit(1);
}

const commands = fs
  .readdirSync(path.join(__dirname, 'commands'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(`./commands/${f}`).data.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`🔄 Registrando ${commands.length} comando(s)...`);
    const route = GUILD_ID
      ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
      : Routes.applicationCommands(CLIENT_ID);
    await rest.put(route, { body: commands });
    console.log(GUILD_ID ? '✅ Comandos registrados no servidor!' : '✅ Comandos globais registrados (podem levar até 1h).');
  } catch (err) {
    console.error('❌ Falha ao registrar comandos:', err);
    process.exit(1);
  }
})();
