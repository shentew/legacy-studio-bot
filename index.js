const { Client, ActivityType, Collection, GatewayIntentBits } = require("discord.js");

// 1. Configuración del Cliente con Intents explícitos (más seguro y legible)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.slashCommands = new Collection();

// 2. Cargar eventos
require("./handlers/eventHandler").loadEvents(client);

client.once("clientReady", async () => {
    console.log(`✅ Bot Encendido Como: ${client.user.tag}`);

    client.user.setActivity(`Legacy Studio`, {
        type: ActivityType.Watching
    });

    await require("./handlers/slashHandler").loadSlash(client);
});

// 3. 👇 INICIAMOS EL DASHBOARD INMEDIATAMENTE 👇
// Al ponerlo FUERA de clientReady, garantizamos que la web arranque 
// y Render detecte el puerto, incluso si Discord tarda 1 segundo en conectar.
console.log("🌐 Iniciando servidor del Dashboard...");
require("./dashboard.js")(client);

// 4. Encender el bot con manejo de errores
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERROR CRÍTICO DE TOKEN:", err.message);
    console.error("💡 Ve a Render -> Environment y verifica que el TOKEN no tenga espacios ni comillas.");
});