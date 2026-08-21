const { Client, ActivityType, Collection, GatewayIntentBits } = require("discord.js");

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

// 2. Iniciar Dashboard (el dashboard.js ya maneja su propio servidor)
console.log("🌐 Iniciando Legacy Studio Dashboard...");
require("./dashboard.js")(client);

// 3. Encender el bot
console.log("🔑 Conectando a Discord...");
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERROR DE TOKEN:", err.message);
});