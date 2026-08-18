const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../ticketConfig.json');

module.exports = {
    name: "messageDelete",
    async execute(message, client) {
        // Ignorar si es un mensaje parcial (no se pudo cargar) o de un bot
        if (message.partial || message.author?.bot) return;

        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        if (!config.logChannelId) return;

        const logChannel = message.guild.channels.cache.get(config.logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#fbbf24')
            .setTitle('🗑️ Mensaje Eliminado')
            .addFields(
                { name: 'Autor', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Contenido', value: message.content.length > 1000 ? message.content.substring(0, 1000) + '...' : (message.content || '*Sin contenido (posible imagen/embed)*') }
            )
            .setTimestamp();

        logChannel.send({ embeds: [embed] });
    }
};