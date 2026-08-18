const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../ticketConfig.json');

module.exports = {
    name: "messageCreate",
    async execute(message, client) {
        // Ignorar mensajes de bots o DMs
        if (message.author.bot || !message.guild) return;

        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        if (!config.bannedWords) return;

        // Convertir la lista de palabras en un array y limpiar espacios
        const words = config.bannedWords.split(',').map(w => w.trim().toLowerCase());
        const messageContent = message.content.toLowerCase();

        // Verificar si el mensaje contiene alguna palabra prohibida
        const foundWord = words.find(word => messageContent.includes(word));

        if (foundWord) {
            // Borrar el mensaje
            await message.delete().catch(() => {});
            
            // Avisar al usuario (y borrar el aviso después de 5 seg para no spamear)
            const warning = await message.channel.send({ 
                content: `⚠️ ${message.author}, no está permitido usar la palabra "**${foundWord}**". Tu mensaje ha sido eliminado.` 
            });
            
            setTimeout(() => warning.delete().catch(() => {}), 5000);

            // Opcional: Enviar log al canal de logs
            if (config.logChannelId) {
                const logChannel = message.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const { EmbedBuilder } = require('discord.js');
                    const logEmbed = new EmbedBuilder()
                        .setColor('#ed4245')
                        .setTitle('🛡️ Auto-Moderación: Mensaje Eliminado')
                        .addFields(
                            { name: 'Usuario', value: `${message.author.tag} (${message.author.id})`, inline: true },
                            { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
                            { name: 'Palabra detectada', value: `\`${foundWord}\`` }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }
            }
        }
    }
};