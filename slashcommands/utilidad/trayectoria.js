const { SlashCommandBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// CORREGIDO: Subimos DOS niveles (../../) porque estamos dentro de slashcommands/utilidad/
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
        // 1. Leer configuración
        let config = {};
        if (fs.existsSync(configPath)) {
            try {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) {
                console.error("Error leyendo ticketConfig.json");
            }
        }

        const channelId = config.portfolioChannelId;
        const channel = interaction.guild.channels.cache.get(channelId);

        // 2. Validaciones
        if (!channel) {
            return interaction.reply({ 
                content: '❌ Error: No se ha configurado el canal de portafolio. Contacta al admin.', 
                ephemeral: true 
            });
        }
        if (channel.type !== ChannelType.GuildForum) {
            return interaction.reply({ 
                content: '❌ Error: El canal configurado no es un Canal de Foro.', 
                ephemeral: true 
            });
        }

        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion');
        const archivo = interaction.options.getAttachment('imagen');

        // 3. Preparar el archivo para Discord
        const attachment = new AttachmentBuilder(archivo.url, { name: archivo.name });

        // 4. Crear el Post en el Foro
        try {
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

            await interaction.editReply(`✅ ¡Tu proyecto **${titulo}** se publicó con éxito en el portafolio! \n ${thread.url}`);
            
        } catch (error) {
            console.error("Error al crear el post del foro:", error);
            await interaction.editReply('❌ Ocurrió un error al crear el post. Revisa que el bot tenga permisos para crear hilos en ese foro.');
        }
    }
};