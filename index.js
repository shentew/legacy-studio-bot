// 🛠️ Forzar IPv4 por si acaso
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Client, GatewayIntentBits } = require("discord.js");
const express = require('express');

// ==========================================
// 1. ¡INICIAR EL SERVIDOR WEB PRIMERO!
// Esto garantiza que Render vea el puerto y marque el deploy como ÉXITO.
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('🟢 Dashboard en línea. El sistema está activo.');
});

app.listen(PORT, () => {
    console.log(`✅ SERVIDOR WEB ACTIVO en puerto ${PORT}. Render ya no se colgará.`);
});

// ==========================================
// 2. INTENTAR CONEXIÓN A DISCORD EN SEGUNDO PLANO
// ==========================================
console.log("🔍 Iniciando conexión a Discord en segundo plano...");
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds]
});

console.log("🔑 Token longitud:", process.env.TOKEN ? process.env.TOKEN.length : "NULO");

// Creamos un "timeout" de 15 segundos. Si Discord no responde, no congelamos todo el sistema.
const loginTimeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Tiempo de espera agotado (15s)")), 15000);
});

Promise.race([client.login(process.env.TOKEN), loginTimeout])
    .then(() => {
        console.log("✅ ¡ÉXITO! El bot se conectó a Discord correctamente.");
    })
    .catch(err => {
        console.error("⚠️ No se pudo conectar a Discord:", err.message);
        console.error("💡 EL DASHBOARD SIGUE FUNCIONANDO. Revisa el Token o los 'Intents' en Discord Developer Portal.");
    });