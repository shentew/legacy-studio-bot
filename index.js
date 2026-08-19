const { Client, GatewayIntentBits } = require("discord.js");

console.log("🔍 INICIANDO PRUEBA DE CONEXIÓN PURA...");

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds] // El permiso más básico de todos
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