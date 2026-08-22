const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
                    await interaction.followUp({ content: "Hubo un error ejecutando el comando.", ephemeral: true });
                } else {
                    await interaction.reply({ content: "Hubo un error ejecutando el comando.", ephemeral: true });
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

                let config = {};
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }
                
                const rolStaffId = config.ticketPanel?.staffRoleId;
                const maxTickets = config.maxTicketsPerUser || 1;

                if (!rolStaffId) {
                    return interaction.reply({ content: 'Error: No se ha configurado el rol staff. Configúralo en el dashboard web.', ephemeral: true });
                }

                const userTickets = guild.channels.cache.filter(c => 
                    c.type === ChannelType.GuildText && c.topic && c.topic.includes(`ID: ${user.id}`)
                ).size;

                if (userTickets >= maxTickets) {
                    return interaction.reply({ 
                        content: `⚠️ Ya tienes el máximo de tickets permitidos (${maxTickets}). Cierra uno antes de abrir otro.`, 
                        ephemeral: true 
                    });
                }

                const reasonClean = selectedValue
                    .toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
                    .replace(/[^a-z0-9]/g, '-') 
                    .replace(/-+/g, '-') 
                    .substring(0, 15); 

                let category = guild.channels.cache.find(
                    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('ticket')
                );

                if (!category) {
                    category = await guild.channels.create({
                        name: '🎫 Tickets',
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: [
                            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                            { id: rolStaffId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels] }
                        ]
                    });
                }

                const channelName = `${reasonClean}-${user.user.username}`.substring(0, 100);

                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category.id, 
                    topic: `Ticket de ${user.user.tag} | Motivo: ${selectedValue} | ID: ${user.id}`,
                    permissionOverwrites: [
                        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: rolStaffId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                    ],
                });

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
                
                const rolStaffId = config.ticketPanel?.staffRoleId;
                if (rolStaffId && !interaction.member.roles.cache.has(rolStaffId)) {
                    return interaction.reply({ content: '🚫 Solo el staff puede cerrar este ticket.', ephemeral: true });
                }

                await interaction.update({ content: '🔒 Cerrando ticket y generando transcripción...', components: [] });

                let transcript = `--- TRANSCRIPCIÓN DEL TICKET: ${channel.name} ---\nFecha: ${new Date().toLocaleString()}\n\n`;
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

                try {
                    const userIdMatch = channel.topic.match(/ID: (\d+)/);
                    if (userIdMatch) {
                        const targetUser = await client.users.fetch(userIdMatch[1]);
                        await targetUser.send({
                            content: `📄 Aquí tienes la transcripción de tu ticket cerrado (**${channel.name}**).`,
                            files: [fileName]
                        });
                    }
                } catch (error) {
                    console.log(`No se pudo enviar la transcripción por MD a ${channel.name} (MD cerrados).`);
                }

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

            // 3.2 GESTIONAR SUGERENCIAS
            else if (interaction.customId === 'sugerencia_aprobar' || interaction.customId === 'sugerencia_rechazar') {
                let config = {};
                if (fs.existsSync(configPath)) {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                }

                const rolStaffId = config.ticketPanel?.staffRoleId;

                if (!rolStaffId) {
                    return interaction.reply({ 
                        content: '🚫 Error: No hay un rol de staff configurado.', 
                        ephemeral: true 
                    });
                }

                if (!interaction.member.roles.cache.has(rolStaffId)) {
                    return interaction.reply({ 
                        content: '🚫 Solo el staff puede aprobar o rechazar sugerencias.', 
                        ephemeral: true 
                    });
                }

                const embed = interaction.message.embeds[0];
                const isApprove = interaction.customId === 'sugerencia_aprobar';
                
                const newEmbed = EmbedBuilder.from(embed)
                    .setColor(isApprove ? '#3ba55d' : '#ed4245')
                    .setFooter({ text: `${isApprove ? '✅ Aprobado' : '❌ Rechazado'} por ${interaction.user.tag}` })
                    .setTimestamp();

                await interaction.update({ embeds: [newEmbed], components: [] });
            }
        }
    }
}