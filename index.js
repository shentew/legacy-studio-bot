const { Client, ActivityType, Collection, GatewayIntentBits } = require("discord.js");

console.log("🚀 PASO 1: Iniciando configuración del cliente...");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.slashCommands = new Collection();

console.log("🚀 PASO 2: Cargando eventos...");
try {
    require("./handlers/eventHandler").loadEvents(client);
    console.log("✅ Eventos cargados correctamente.");
} catch (err) {
    console.error("❌ ERROR AL CARGAR EVENTOS:", err);
}

client.once("clientReady", async () => {
    console.log("🚀 PASO 3: ¡EVENTO 'CLIENT READY' DISPARADO POR DISCORD!");
    console.log(`✅ Bot Encendido Como: ${client.user.tag}`);

    client.user.setActivity(`Legacy Studio`, {
        type: ActivityType.Watching
    });

    console.log("🚀 PASO 4: Cargando comandos slash...");
    try {
        await require("./handlers/slashHandler").loadSlash(client);
        console.log("✅ Comandos slash cargados correctamente.");
    } catch (err) {
        console.error("❌ ERROR AL CARGAR COMANDOS:", err);
    }
});

console.log("🚀 PASO 5: Iniciando servidor del Dashboard...");
require("./dashboard.js")(client);

console.log("🔑 Longitud del Token recibido:", process.env.TOKEN ? process.env.TOKEN.length : "INDEFINIDO");

console.log("🚀 PASO 6: Intentando hacer login en Discord...");
client.login(process.env.TOKEN)
    .then(() => {
        console.log("✅ Promesa de login resuelta. Conectando al Gateway de Discord...");
    })
    .catch(err => {
        console.error("❌ ERROR CRÍTICO DE DISCORD:", err.message);
    });