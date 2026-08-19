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

// 🔍 Capturar cualquier error oculto del cliente de Discord
client.on('error', error => {
    console.error("❌ ERROR NO MANEJADO DEL CLIENTE DISCORD:", error);
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

const token = process.env.TOKEN;
console.log("🔑 Longitud del Token:", token ? token.length : "INDEFINIDO");
console.log("🔑 Inicio del Token (verificación):", token ? token.substring(0, 15) + "..." : "NULO");

console.log("🚀 PASO 6: Intentando hacer login en Discord...");

// 🔍 Forzamos un timeout de 10 segundos por si el login se cuelga
const loginPromise = client.login(token);
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("El login se quedó colgado por más de 10 segundos.")), 10000);
});

Promise.race([loginPromise, timeoutPromise])
    .then(() => {
        console.log("✅ ¡Login exitoso! Conectado al Gateway de Discord.");
    })
    .catch(err => {
        console.error("❌ ERROR CRÍTICO DE DISCORD:", err.message);
        console.error("💡 CAUSAS MÁS PROBABLES:");
        console.error("1. El token en Render es diferente al de tu PC (o tiene espacios).");
        console.error("2. Faltan activar los 'Privileged Gateway Intents' en el Developer Portal.");
    });