// slashcommands/utilidad/sugerencia.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../ticketConfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sugerencia')
        .setDescription('Envía una sugerencia al canal configurado')
        .addStringOption(option => 
            option.setName('texto')
                  .setDescription('Escribe tu sugerencia aquí')
                  .setRequired(true)
        ),

    async execute(interaction) {
        // 1. Leer la configuración
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        const channelId = config.suggestionChannelId;
        
        // 2. Verificar si el canal está configurado
        if (!channelId) {
            return interaction.reply({ 
                content: '⚠️ El canal de sugerencias no está configurado. Ve al dashboard y configúralo en la pestaña Moderación.', 
                ephemeral: true 
            });
        }

        // 3. Verificar si el canal existe
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) {
            return interaction.reply({ 
                content: '❌ No encuentro el canal de sugerencias. Es posible que haya sido eliminado.', 
                ephemeral: true 
            });
        }

        const textoSugerencia = interaction.options.getString('texto');

        // 4. Crear el Embed de la sugerencia
        const embed = new EmbedBuilder()
            .setColor('#fbbf24') // Color ámbar/dorado
            .setTitle('💡 Nueva Sugerencia')
            .setDescription(textoSugerencia)
            .setAuthor({ 
                name: interaction.user.tag, 
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
            })
            .setFooter({ text: `ID de usuario: ${interaction.user.id}` })
            .setTimestamp();

        // 5. Crear los botones de Aprobar / Rechazar
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('sugerencia_aprobar')
                .setLabel('Aprobar')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('sugerencia_rechazar')
                .setLabel('Rechazar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

        // 6. Enviar al canal y responder al usuario
        await channel.send({ embeds: [embed], components: [row] });
        
        await interaction.reply({ 
            content: '✅ ¡Tu sugerencia ha sido enviada al canal de sugerencias!', 
            ephemeral: true 
        });
    },
};