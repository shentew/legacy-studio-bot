// slashcommands/tickets/ticket.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../ticketConfig.json');

module.exports = {
    // Usamos SlashCommandBuilder para que .toJSON() funcione en tu handler
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Envía el panel de tickets configurado en el dashboard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. Leer la configuración desde el JSON (que viene del Dashboard)
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        const panel = config.ticketPanel;
        
        // Verificar que se haya configurado algo desde la web
        if (!panel || !panel.targetChannelId) {
            return interaction.reply({ 
                content: '⚠️ Primero debes configurar y enviar el panel desde el Dashboard web (localhost:3000).', 
                ephemeral: true 
            });
        }

        // 2. Obtener el canal de destino
        const channel = interaction.guild.channels.cache.get(panel.targetChannelId);
        if (!channel) {
            return interaction.reply({ 
                content: '❌ El canal configurado en el dashboard ya no existe o el bot no tiene permisos.', 
                ephemeral: true 
            });
        }

        // 3. Construir el Embed con los datos del Dashboard
        const embed = new EmbedBuilder()
            .setColor(panel.embedColor || '#5865F2')
            .setTitle(panel.embedTitle || '🎫 Centro de Soporte')
            .setDescription(panel.embedDescription || 'Selecciona una opción abajo.')
            .setFooter({ text: 'Selecciona una opción para abrir un ticket.' });

        if (panel.embedThumbnail) {
            embed.setThumbnail(panel.embedThumbnail);
        }

        // 4. Construir el Menú Desplegable
        const opcionesArray = panel.options ? panel.options.split(',').map(opt => opt.trim()) : ['Soporte', 'Reclamos'];
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('crear_ticket_menu')
            .setPlaceholder('Haz clic para abrir un ticket...')
            .addOptions(opcionesArray.map((opt, index) => ({
                label: opt,
                value: `ticket_opcion_${index}`
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 5. Enviar el panel al canal configurado
        await channel.send({ embeds: [embed], components: [row] });
        
        await interaction.reply({ 
            content: `✅ ¡Panel de tickets enviado con éxito en ${channel}!`, 
            ephemeral: true 
        });
    },
};