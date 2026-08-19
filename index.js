const { Client, ActivityType, Collection, GatewayIntentBits } = require("discord.js");

// 1. Configuración del Cliente con Intents explícitos
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

// 3. Iniciar el Dashboard
console.log("🌐 Iniciando servidor del Dashboard...");
require("./dashboard.js")(client);

// 4. 🔍 DIAGNÓSTICO DEL TOKEN 🔍
console.log("🔑 Longitud del Token recibido:", process.env.TOKEN ? process.env.TOKEN.length : "INDEFINIDO (NULL o VACÍO)");

if (!process.env.TOKEN || process.env.TOKEN.trim() === "") {
    console.error("❌ ERROR FATAL: La variable de entorno TOKEN está vacía o no existe en Render.");
    console.error("💡 SOLUCIÓN: Ve a Render > Environment y asegúrate de crear una variable llamada exactamente 'TOKEN' con tu token de Discord.");
} else {
    console.log("✅ Token detectado. Intentando conectar a Discord...");
}

// 5. Encender el bot con manejo de errores
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERROR CRÍTICO DE DISCORD:", err.message);
    console.error("💡 Ve a Render -> Environment y verifica que el TOKEN no tenga espacios ni comillas.");
});