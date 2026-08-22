const { SlashCommandBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../ticketConfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trayectoria')
        .setDescription('📸 Publica un proyecto o avance en el portafolio de Legacy Studio.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('Nombre del proyecto o build (Ej: Spawn Evento Halloween)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('descripcion')
                .setDescription('Describe qué hiciste, qué herramientas usaste o el progreso.')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('imagen')
                .setDescription('Sube una foto o video de tu trabajo (Obligatorio)')
                .setRequired(true)),

    async execute(interaction) {
        let config = {};
        if (fs.existsSync(configPath)) {
            try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
        }

        const channelId = config.portfolioChannelId;
        
        // Validación temprana ANTES de interactuar con Discord
        if (!channelId) {
            return interaction.reply({ 
                content: '❌ Error: El ID del canal de portafolio no está configurado. Contacta al admin.', 
                ephemeral: true 
            });
        }

        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel || channel.type !== ChannelType.GuildForum) {
            return interaction.reply({ 
                content: '❌ Error: El canal configurado no es un Canal de Foro válido.', 
                ephemeral: true 
            });
        }

        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion');
        const archivo = interaction.options.getAttachment('imagen');

        const attachment = new AttachmentBuilder(archivo.url, { name: archivo.name });

        try {
            // Diferimos la respuesta inmediatamente para ganar tiempo (evita "Unknown interaction")
            await interaction.deferReply({ ephemeral: true });

            const thread = await channel.threads.create({
                name: titulo,
                message: {
                    content: `**👤 Builder:** <@${interaction.user.id}>\n**📝 Descripción:**\n${descripcion}`,
                    files: [attachment]
                },
                appliedTags: [], 
                reason: `Proyecto publicado por ${interaction.user.tag}`
            });

            // Verificamos si la interacción aún es válida antes de editar
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(`✅ ¡Tu proyecto **${titulo}** se publicó con éxito en el portafolio! \n ${thread.url}`);
            } else {
                await interaction.reply({ content: `✅ ¡Tu proyecto **${titulo}** se publicó con éxito!`, ephemeral: true });
            }
            
        } catch (error) {
            console.error("Error al crear el post del foro:", error);
            
            // Manejo seguro de errores: evita que el bot se caiga si la interacción expiró
            try {
                const errorMsg = '❌ Ocurrió un error al crear el post. Revisa que el bot tenga permisos de "Crear hilos" y "Adjuntar archivos" en ese foro.';
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(errorMsg);
                } else {
                    await interaction.reply({ content: errorMsg, ephemeral: true });
                }
            } catch (replyError) {
                console.error("No se pudo responder al usuario:", replyError);
            }
        }
    }
};