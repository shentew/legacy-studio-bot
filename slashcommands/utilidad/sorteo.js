const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sorteo')
        .setDescription('Crea un sorteo con temporizador')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option => 
            option.setName('duracion')
                  .setDescription('Duración del sorteo (ej: 1h, 30m, 1d)')
                  .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('ganadores')
                  .setDescription('Número de ganadores')
                  .setRequired(true)
                  .setMinValue(1)
        )
        .addStringOption(option => 
            option.setName('premio')
                  .setDescription('El premio del sorteo')
                  .setRequired(true)
        ),

    async execute(interaction) {
        const duracion = interaction.options.getString('duracion');
        const ganadores = interaction.options.getInteger('ganadores');
        const premio = interaction.options.getString('premio');

        const duracionMs = ms(duracion);
        if (!duracionMs) {
            return interaction.reply({ 
                content: '❌ Formato de duración inválido. Usa: 1h, 30m, 1d, etc.', 
                ephemeral: true 
            });
        }

        const endTime = Date.now() + duracionMs;

        const embed = new EmbedBuilder()
            .setColor('#a855f7')
            .setTitle('🎉 ¡SORTEO!')
            .setDescription(
                `**Premio:** ${premio}\n` +
                `**Ganadores:** ${ganadores}\n` +
                `**Termina:** <t:${Math.floor(endTime / 1000)}:R>\n\n` +
                `Reacciona con 🎉 para participar`
            )
            .setFooter({ text: `Sorteo creado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        await message.react('🎉');

        // Guardar datos del sorteo para terminar después
        const filter = (reaction) => reaction.emoji.name === '🎉';
        const collector = message.createReactionCollector({ filter, time: duracionMs });

        collector.on('end', async (collected) => {
            const users = await collected.first()?.users.fetch();
            const participants = users?.filter(u => !u.bot) || [];

            if (participants.size === 0) {
                const endEmbed = new EmbedBuilder()
                    .setColor('#ed4245')
                    .setTitle('🎉 Sorteo Terminado')
                    .setDescription(`**Premio:** ${premio}\n\n❌ No hubo participantes suficientes.`)
                    .setTimestamp();

                await message.edit({ embeds: [endEmbed] });
                return;
            }

            // Seleccionar ganadores aleatorios
            const winners = [];
            const participantsArray = Array.from(participants.keys());
            
            for (let i = 0; i < Math.min(ganadores, participantsArray.length); i++) {
                const randomIndex = Math.floor(Math.random() * participantsArray.length);
                winners.push(participantsArray[randomIndex]);
                participantsArray.splice(randomIndex, 1);
            }

            const endEmbed = new EmbedBuilder()
                .setColor('#3ba55d')
                .setTitle('🎉 ¡Sorteo Terminado!')
                .setDescription(
                    `**Premio:** ${premio}\n` +
                    `**Ganador${ganadores > 1 ? 'es' : ''}:** ${winners.map(w => `<@${w}>`).join(', ')}\n` +
                    `**Participantes:** ${participants.size}`
                )
                .setTimestamp();

            await message.edit({ embeds: [endEmbed] });
            await message.reply(`🎊 ¡Felicidades ${winners.map(w => `<@${w}>`).join(', ')}! Han ganado **${premio}**`);
        });
    },
};