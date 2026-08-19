// 🛠️ ESTAS 2 LÍNEAS FUERZAN LA RED A USAR IPv4 (SOLUCIONA EL CUELGE EN RENDER)
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Client, GatewayIntentBits } = require("discord.js");

console.log("🔍 INICIANDO PRUEBA DE CONEXIÓN CON FIX IPv4...");

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds]
});

console.log("🔑 Token longitud:", process.env.TOKEN ? process.env.TOKEN.length : "NULO");

client.login(process.env.TOKEN)
    .then(() => {
        console.log("✅ ¡ÉXITO TOTAL! El bot se conectó a Discord.");
        process.exit(0); // Cerramos el proceso porque ya probamos que funciona
    })
    .catch(err => {
        console.error("❌ FALLO DE CONEXIÓN:", err.message);
        process.exit(1);
    });