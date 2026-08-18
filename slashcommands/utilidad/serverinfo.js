const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Muestra información detallada del servidor'),

    async execute(interaction) {
        const guild = interaction.guild;
        
        // Esperar a que se carguen todos los miembros
        await guild.members.fetch();
        
        const embed = new EmbedBuilder()
            .setColor('#a855f7')
            .setTitle(`📊 Información de ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👑 Propietario', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Fecha de Creación', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🆔 ID del Servidor', value: `\`${guild.id}\``, inline: true },
                { name: '👥 Miembros', value: `\`${guild.memberCount}\` usuarios`, inline: true },
                { name: '📝 Canales', value: `\`${guild.channels.cache.size}\` canales`, inline: true },
                { name: '🎭 Roles', value: `\`${guild.roles.cache.size}\` roles`, inline: true },
                { name: '😊 Emojis', value: `\`${guild.emojis.cache.size}\` emojis`, inline: true },
                { name: '🌍 Región', value: `${guild.preferredLocale || 'No especificada'}`, inline: true },
                { name: '🔐 Nivel de Verificación', value: `${guild.verificationLevel}`, inline: true }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};