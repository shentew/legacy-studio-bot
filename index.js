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
    await require("./handlers/slashHandler").loadSlash(client);
});

// 2. Iniciar Dashboard
const app = express();
// Replit asigna el puerto automáticamente en process.env.PORT
const PORT = process.env.PORT || 3000; 

require("./dashboard.js")(client);

app.listen(PORT, () => {
    console.log(`🌐 Dashboard corriendo en puerto ${PORT}`);
    console.log(`🌐 TU URL PERMANENTE ES: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`);
});

// 3. Encender el bot
console.log("🔑 Conectando a Discord...");
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERROR DE TOKEN:", err.message);
});