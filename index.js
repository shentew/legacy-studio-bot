const { Client, ActivityType, Collection, GatewayIntentBits } = require("discord.js");
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Buena práctica de red

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
console.log("🌐 Iniciando servidor del Dashboard...");
require("./dashboard.js")(client);

// 3. Encender el bot
console.log("🔑 Conectando a Discord...");
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERROR DE TOKEN:", err.message);
});