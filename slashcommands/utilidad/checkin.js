const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../ticketConfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkin')
        .setDescription('🛠️ Registra tu estado de trabajo en Legacy Studio.')
        .addStringOption(option =>
            option.setName('estado')
                .setDescription('¿Cuál es tu estado actual?')
                .setRequired(true)
                .addChoices(
                    { name: ' Trabajando activamente', value: 'trabajando' },
                    { name: ' En pausa / Almuerzo', value: 'pausa' },
                    { name: '🔴 Terminé por hoy', value: 'terminado' },
                    { name: '⚪ Ausente / No puedo hoy', value: 'ausente' }
                ))
        .addStringOption(option =>
            option.setName('mensaje')
                .setDescription('¿En qué estás trabajando o qué hiciste?')
                .setRequired(false)),

    async execute(interaction) {
        // 1. Leer la configuración para saber dónde enviar el log
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        // ⚠️ IMPORTANTE: Reemplaza 'ID_DEL_CANAL_CHECKIN' por el ID real de tu canal #check-in-diario
        // Puedes obtener el ID activando el Modo Desarrollador en Discord y clic derecho en el canal -> Copiar ID.
        const logChannelId = config.trackingChannelId || '1540190771863355463'; 
        const logChannel = interaction.guild.channels.cache.get(logChannelId);

        if (!logChannel || logChannel.type !== ChannelType.GuildText) {
            return interaction.reply({ 
                content: '❌ Error: No se ha configurado el canal de registro. Contacta al admin.', 
                ephemeral: true 
            });
        }

        const estado = interaction.options.getString('estado');
        const mensaje = interaction.options.getString('mensaje') || 'Sin detalles adicionales.';
        const user = interaction.user;
        const timestamp = new Date().toLocaleString('es-ES');

        // 2. Colores según el estado
        let color = '#2ecc71'; // Verde
        let emoji = '🟢';
        if (estado === 'pausa') { color = '#f1c40f'; emoji = '🟡'; }
        if (estado === 'terminado') { color = '#e74c3c'; emoji = '🔴'; }
        if (estado === 'ausente') { color = '#95a5a6'; emoji = '⚪'; }

        // 3. Crear el Embed bonito
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} Check-in de ${user.tag}`)
            .addFields(
                { name: ' Builder', value: `${user} (${user.id})`, inline: true },
                { name: '🕒 Hora', value: timestamp, inline: true },
                { name: '📝 Estado', value: estado.toUpperCase(), inline: true },
                { name: '💬 Detalles', value: mensaje }
            )
            .setFooter({ text: 'Legacy Studio Tracking System' })
            .setTimestamp();

        // 4. Enviar al canal y responder al usuario
        await logChannel.send({ embeds: [embed] });
        
        await interaction.reply({ 
            content: `✅ ¡Check-in registrado! Estado: **${estado.toUpperCase()}**.`, 
            ephemeral: true 
        });
    }
};