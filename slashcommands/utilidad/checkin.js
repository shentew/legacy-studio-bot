const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// CORREGIDO: Subimos DOS niveles (../../) porque estamos dentro de slashcommands/utilidad/
const configPath = path.join(__dirname, '../../ticketConfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkin')
        .setDescription('Registra tu estado de trabajo en Legacy Studio.')
        .addStringOption(option =>
            option.setName('estado')
                .setDescription('Cual es tu estado actual')
                .setRequired(true)
                .addChoices(
                    { name: '🟢 Trabajando activamente', value: 'trabajando' },
                    { name: '🟡 En pausa o Almuerzo', value: 'pausa' },
                    { name: '🔴 Termine por hoy', value: 'terminado' },
                    { name: '⚪ Ausente hoy', value: 'ausente' }
                ))
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('En que estas trabajando (Opcional)')
                .setRequired(false)),

    async execute(interaction) {
        let config = {};
        if (fs.existsSync(configPath)) {
            try {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) {
                console.error("Error leyendo ticketConfig.json");
            }
        }

        // Usa el ID de la config, o el de respaldo si no hay ninguno
        const logChannelId = config.trackingChannelId || '1540190771863355463'; 
        const logChannel = interaction.guild.channels.cache.get(logChannelId);

        if (!logChannel || logChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ Error: No se ha configurado el canal de registro o el ID es incorrecto.', 
                ephemeral: true 
            });
        }

        const estado = interaction.options.getString('estado');
        const mensaje = interaction.options.getString('mensaje') || 'Sin detalles adicionales.';
        const user = interaction.user;
        const timestamp = new Date().toLocaleString('es-ES');

        let color = '#2ecc71'; 
        let emoji = '🟢';
        if (estado === 'pausa') { color = '#f1c40f'; emoji = '🟡'; }
        if (estado === 'terminado') { color = '#e74c3c'; emoji = '🔴'; }
        if (estado === 'ausente') { color = '#95a5a6'; emoji = '⚪'; }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} Check-in de ${user.username}`)
            .addFields(
                { name: '👤 Builder', value: `<@${user.id}>`, inline: true },
                { name: '🕒 Hora', value: timestamp, inline: true },
                { name: '📝 Estado', value: estado.toUpperCase(), inline: true },
                { name: '💬 Detalles', value: mensaje }
            )
            .setFooter({ text: 'Legacy Studio Tracking System' })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] });
        
        await interaction.reply({ 
            content: `✅ ¡Check-in registrado! Estado: **${estado.toUpperCase()}**.`, 
            ephemeral: true 
        });
    }
};