const { Client, ActivityType, Collection, GatewayIntentBits } = require("discord.js");
const express = require('express');
const localtunnel = require('localtunnel'); // Necesario para que la web sea visible en Bot-Hosting

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
const PORT = process.env.PORT || 3000;
console.log("🌐 Iniciando servidor del Dashboard...");
require("./dashboard.js")(client);

// 3. Generar enlace público automáticamente (Clave para Bot-Hosting)
(async () => {
    try {
        const tunnel = await localtunnel({ port: PORT });
        console.log("==================================================");
        console.log(`🌐 ¡TU DASHBOARD PÚBLICO ESTÁ EN: ${tunnel.url}`);
        console.log("==================================================");
    } catch (err) {
        console.log("⚠️ No se pudo generar el enlace público, pero el bot funciona.");
    }
})();

// 4. Encender el bot
console.log("🔑 Conectando a Discord...");
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERROR DE TOKEN:", err.message);
});