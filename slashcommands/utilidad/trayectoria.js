const { SlashCommandBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../ticketConfig.json');

// Mapa para guardar los cooldowns por usuario y evitar ejecuciones dobles
const cooldowns = new Map();

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
        // 1. DEBUG: Esto nos dirá en la consola si el comando se dispara 1 o 2 veces
        console.log(`[DEBUG] /trayectoria ejecutado | Usuario: ${interaction.user.tag} | ID Interacción: ${interaction.id}`);

        // 2. SISTEMA DE COOLDOWN (5 segundos)
        const now = Date.now();
        const timestamps = cooldowns.get(interaction.user.id) || new Map();
        const cooldownAmount = 5000; // 5000 milisegundos = 5 segundos

        if (timestamps.has(interaction.commandName)) {
            const expirationTime = timestamps.get(interaction.commandName) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return interaction.reply({ 
                    content: `⏳ Por favor espera ${timeLeft.toFixed(1)} segundos antes de usar este comando de nuevo.`, 
                    ephemeral: true 
                });
            }
        }
        
        // Registrar el uso del comando
        timestamps.set(interaction.commandName, now);
        cooldowns.set(interaction.user.id, timestamps);

        // 3. Diferir respuesta inmediatamente
        await interaction.deferReply().catch(() => {});

        try {
            let config = {};
            if (fs.existsSync(configPath)) {
                try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
            }

            const channelId = config.portfolioChannelId;
            
            if (!channelId) {
                return interaction.editReply({ 
                    content: '❌ El canal de portafolio no está configurado en el dashboard.', 
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

            // 4. Crear el hilo en el foro
            const thread = await channel.threads.create({
                name: titulo,
                message: {
                    content: `**👤 Builder:** <@${interaction.user.id}>\n**📝 Descripción:**\n${descripcion}`,
                    files: [attachment]
                },
                reason: `Proyecto publicado por ${interaction.user.tag}`
            });

            // 5. Responder con éxito
            await interaction.editReply({ 
                content: `✅ ¡Tu proyecto **${titulo}** se publicó con éxito!\n🔗 ${thread.url}`,
                ephemeral: true 
            });
            
        } catch (error) {
            console.error("Error en /trayectoria:", error);
            try {
                await interaction.editReply({ 
                    content: '❌ Ocurrió un error al crear el post. Revisa los permisos del bot.', 
                    ephemeral: true 
                }).catch(() => {});
            } catch (e) {
                console.error("No se pudo enviar el mensaje de error.");
            }
        }
    }
};