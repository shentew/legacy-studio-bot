const { Client, ActivityType, Collection, GatewayIntentBits } = require("discord.js");
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.slashCommands = new Collection();

// 1. Cargar eventos
require("./handlers/eventHandler").loadEvents(client);

client.once("clientReady", async () => {
    console.log(`✅ Bot Encendido Como: ${client.user.tag}`);
    client.user.setActivity(`Legacy Studio`, { type: ActivityType.Watching });
    
    // Cargar comandos slash
    await require("./handlers/slashHandler").loadSlash(client);
    console.log("✅ Comandos slash cargados correctamente.");
});

// 2. Iniciar Dashboard
const app = express();
const PORT = process.env.SERVER_PORT || 26212; // Usa el puerto fijo de Bot-Hosting

console.log("🌐 Iniciando servidor del Dashboard...");
require("./dashboard.js")(client);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Dashboard corriendo en puerto ${PORT}`);
    console.log(` TU URL FIJA ES: https://fi10.bot-hosting.cloud:${PORT}`);
    console.log(`🌐 Esta URL NUNCA cambia. Guárdala en favoritos.`);
});

// 3. Encender el bot
console.log("🔑 Conectando a Discord...");
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERROR DE TOKEN:", err.message);
});