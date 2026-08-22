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
        // 1. Diferir respuesta inmediatamente para evitar "Unknown interaction"
        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        try {
            let config = {};
            if (fs.existsSync(configPath)) {
                try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
            }

            const channelId = config.portfolioChannelId;
            
            if (!channelId) {
                return interaction.editReply('❌ Error: El ID del canal de portafolio no está configurado. Contacta al admin.');
            }

            const channel = interaction.guild.channels.cache.get(channelId);

            if (!channel || channel.type !== ChannelType.GuildForum) {
                return interaction.editReply('❌ Error: El canal configurado no es un Canal de Foro válido.');
            }

            const titulo = interaction.options.getString('titulo');
            const descripcion = interaction.options.getString('descripcion');
            const archivo = interaction.options.getAttachment('imagen');

            const attachment = new AttachmentBuilder(archivo.url, { name: archivo.name });

            // 2. Crear el hilo en el foro
            const thread = await channel.threads.create({
                name: titulo,
                message: {
                    content: `**👤 Builder:** <@${interaction.user.id}>\n**📝 Descripción:**\n${descripcion}`,
                    files: [attachment]
                },
                reason: `Proyecto publicado por ${interaction.user.tag}`
            });

            // 3. Responder al usuario con el enlace
            await interaction.editReply(`✅ ¡Tu proyecto **${titulo}** se publicó con éxito en el portafolio!\n🔗 ${thread.url}`);
            
        } catch (error) {
            console.error("Error al crear el post del foro:", error);
            try {
                await interaction.editReply('❌ Ocurrió un error al crear el post. Asegúrate de que el bot tenga permisos de "Crear hilos públicos" y "Adjuntar archivos" en ese canal.');
            } catch (e) {
                console.error("No se pudo enviar el mensaje de error.");
            }
        }
    }
};