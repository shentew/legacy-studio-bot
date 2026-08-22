const { SlashCommandBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../ticketConfig.json');

//  PROTECCIÓN ANTI-DUPLICADO: Set para guardar IDs de interacciones en proceso
const processingInteractions = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trayectoria')
        .setDescription('📸 Publica un proyecto o avance en el portafolio de Legacy Studio.')
        .addStringOption(option =>
            option.setName('titulo')
                .setDescription('Nombre del proyecto o build')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('descripcion')
                .setDescription('Describe qué hiciste o el progreso.')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('imagen')
                .setDescription('Sube una foto o video de tu trabajo')
                .setRequired(true)),

    async execute(interaction) {
        // ✨ VERIFICAR SI YA SE ESTÁ PROCESANDO ESTA INTERACCIÓN
        if (processingInteractions.has(interaction.id)) {
            console.log(`⚠️ Interacción ${interaction.id} ya está siendo procesada, ignorando duplicado.`);
            return;
        }
        
        // Marcar como en proceso
        processingInteractions.add(interaction.id);

        // Limpiar después de 10 segundos (por si algo falla)
        setTimeout(() => {
            processingInteractions.delete(interaction.id);
        }, 10000);

        // Línea 1: Ganar tiempo inmediatamente
        await interaction.deferReply().catch(() => {});

        try {
            let config = {};
            if (fs.existsSync(configPath)) {
                try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
            }

            const channelId = config.portfolioChannelId;
            
            if (!channelId) {
                return interaction.editReply({ 
                    content: '❌ El canal de portafolio no está configurado.', 
                    ephemeral: true 
                });
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel || channel.type !== ChannelType.GuildForum) {
                return interaction.editReply({ 
                    content: '❌ El canal configurado no es un Canal de Foro válido.', 
                    ephemeral: true 
                });
            }

            const titulo = interaction.options.getString('titulo');
            const descripcion = interaction.options.getString('descripcion');
            const archivo = interaction.options.getAttachment('imagen');

            const attachment = new AttachmentBuilder(archivo.url, { name: archivo.name });

            // Crear el hilo en el foro
            const thread = await channel.threads.create({
                name: titulo,
                message: {
                    content: `**👤 Builder:** <@${interaction.user.id}>\n**📝 Descripción:**\n${descripcion}`,
                    files: [attachment]
                },
                reason: `Proyecto publicado por ${interaction.user.tag}`
            });

            await interaction.editReply({ 
                content: `✅ ¡Tu proyecto **${titulo}** se publicó con éxito!\n🔗 ${thread.url}`,
                ephemeral: true 
            });
            
        } catch (error) {
            console.error("Error en /trayectoria:", error);
            try {
                await interaction.editReply({ 
                    content: '❌ Ocurrió un error al crear el post.', 
                    ephemeral: true 
                }).catch(() => {});
            } catch (e) {
                console.error("No se pudo enviar el mensaje de error.");
            } finally {
                // Limpiar la bandera siempre
                processingInteractions.delete(interaction.id);
            }
        }
    }
};