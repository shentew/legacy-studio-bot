const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Ruta a nuestro archivo de configuración
const configPath = path.join(__dirname, '../ticketConfig.json');

module.exports = {
    name: "interactionCreate",

    async execute(interaction, client) {
        
        // ==========================================
        // 1. LÓGICA PARA COMANDOS SLASH
        // ==========================================
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(error); 

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: "Hubo un error ejecutando el comando.",
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: "Hubo un error ejecutando el comando.",
                        ephemeral: true
                    });
                }
            }
        } 
        
        // ==========================================
        // 2. LÓGICA PARA EL MENÚ DESPLEGABLE (Crear Ticket)
        // ==========================================
        else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'crear_ticket_menu') {
                const guild = interaction.guild;
                const user = interaction.member;
                const selectedValue = interaction.values[0];

                // Leer configuración completa desde el JSON
                let config = {};
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
                
                const rolStaffId = config.staffRoleId;
                const ticketPrefix = config.ticketPrefix || 'ticket';
                const maxTickets = config.maxTicketsPerUser || 1;

                if (!rolStaffId) {
                    return interaction.reply({ content: 'Error: No se ha configurado el rol staff. Usa /ticket primero.', ephemeral: true });
                }

                // Verificar límite de tickets por usuario
                const userTickets = guild.channels.cache.filter(c => 
                    c.name.startsWith(`${ticketPrefix}-`) && c.name.includes(user.user.username)
                ).size;

                if (userTickets >= maxTickets) {
                    return interaction.reply({ 
                        content: `⚠️ Ya tienes el máximo de tickets permitidos (${maxTickets}). Cierra uno antes de abrir otro.`, 
                        ephemeral: true 
                    });
                }

                // Crear el nombre del canal (si es el 2do ticket, agrega un número para no repetir nombres)
                const ticketNumber = userTickets + 1;
                const channelName = ticketNumber === 1 
                    ? `${ticketPrefix}-${user.user.username}` 
                    : `${ticketPrefix}-${user.user.username}-${ticketNumber}`;

                // Crear el canal privado
                const ticketChannel = await guild.channels.create({
                    name: channelName.substring(0, 100), // Límite de Discord: 100 caracteres
                    type: ChannelType.GuildText,
                    topic: `Ticket de ${user.user.tag} | Motivo: ${selectedValue} | ID: ${user.id}`,
                    permissionOverwrites: [
                        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: rolStaffId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                    ],
                });

                // Mensaje de bienvenida y botón de cerrar
                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`🎫 Ticket: ${selectedValue}`)
                    .setDescription(`¡Hola ${user}! 👋\nUn miembro del staff te atenderá lo antes posible.\n\nMientras tanto, describe tu problema con el mayor detalle posible.`);

                const closeButton = new ButtonBuilder()
                    .setCustomId('cerrar_ticket_btn')
                    .setLabel('Cerrar Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒');

                const row = new ActionRowBuilder().addComponents(closeButton);

                await ticketChannel.send({ 
                    content: `${user} | <@&${rolStaffId}>`, 
                    embeds: [welcomeEmbed], 
                    components: [row] 
                });
                
                await interaction.reply({ content: `✅ Ticket creado en ${ticketChannel}`, ephemeral: true });
            }
        }

        // ==========================================
        // 3. LÓGICA PARA BOTONES
        // ==========================================
        else if (interaction.isButton()) {
            
            // 3.1 CERRAR TICKET
            if (interaction.customId === 'cerrar_ticket_btn') {
                const channel = interaction.channel;
                
                let config = {};
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
                
                if (config.staffRoleId && !interaction.member.roles.cache.has(config.staffRoleId)) {
                    return interaction.reply({ content: '🚫 Solo el staff puede cerrar este ticket.', ephemeral: true });
                }

                await interaction.update({ content: '🔒 Cerrando ticket y generando transcripción...', components: [] });

                let transcript = `--- TRANSCRIPCIÓN DEL TICKET: ${channel.name} ---\n`;
                transcript += `Fecha de cierre: ${new Date().toLocaleString()}\n\n`;
                
                const messages = await channel.messages.fetch({ limit: 100 });
                const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
                
                sortedMessages.forEach(msg => {
                    const date = new Date(msg.createdTimestamp).toLocaleString();
                    const author = msg.author.tag;
                    const content = msg.content || '[Contenido no visible (Embed/Archivo/Imagen)]';
                    transcript += `[${date}] ${author}: ${content}\n`;
                });

                const transcriptsDir = path.join(__dirname, '../transcripts');
                if (!fs.existsSync(transcriptsDir)) fs.mkdirSync(transcriptsDir);
                
                const fileName = `${transcriptsDir}/${channel.name}-${Date.now()}.txt`;
                fs.writeFileSync(fileName, transcript);

                if (config.logChannelId) {
                    const logChannel = channel.guild.channels.cache.get(config.logChannelId);
                    if (logChannel) {
                        await logChannel.send({ 
                            content: `📝 Transcripción del ticket cerrado: **${channel.name}** (Cerrado por ${interaction.user.tag})`, 
                            files: [fileName] 
                        });
                    }
                }

                await channel.send({ content: '📄 Aquí tienes la transcripción de este ticket:', files: [fileName] });

                setTimeout(async () => {
                    await channel.delete().catch(console.error);
                }, 5000);
            }

            // 3.2 GESTIONAR SUGERENCIAS (APROBAR / RECHAZAR)
            else if (interaction.customId === 'sugerencia_aprobar' || interaction.customId === 'sugerencia_rechazar') {
                let config = {};
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }

                // Verificar que quien pulsa el botón tenga el rol de staff
                if (config.staffRoleId && !interaction.member.roles.cache.has(config.staffRoleId)) {
                    return interaction.reply({ content: '🚫 Solo el staff puede gestionar sugerencias.', ephemeral: true });
                }

                const embed = interaction.message.embeds[0];
                const isApprove = interaction.customId === 'sugerencia_aprobar';
                
                // Creamos un nuevo embed basado en el original, pero cambiando color y footer
                const newEmbed = EmbedBuilder.from(embed)
                    .setColor(isApprove ? '#3ba55d' : '#ed4245') // Verde si aprueba, Rojo si rechaza
                    .setFooter({ text: `${isApprove ? '✅ Aprobado' : '❌ Rechazado'} por ${interaction.user.tag}` })
                    .setTimestamp();

                // Actualizamos el mensaje: cambiamos el embed y quitamos los botones (components: [])
                await interaction.update({ embeds: [newEmbed], components: [] });
            }
        }
    }
}