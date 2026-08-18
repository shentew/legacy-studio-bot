const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra información de un usuario')
        .addUserOption(option => 
            option.setName('usuario')
                  .setDescription('El usuario del cual quieres ver la información')
                  .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);

        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .map(role => role.toString())
            .join(', ') || 'Sin roles';

        const embed = new EmbedBuilder()
            .setColor('#a855f7')
            .setTitle(`👤 Información de ${user.tag}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                { name: '📛 Apodo', value: member.nickname || 'Sin apodo', inline: true },
                { name: '🤖 ¿Es Bot?', value: user.bot ? 'Sí' : 'No', inline: true },
                { name: '📅 Cuenta Creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Se Unió al Servidor', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🎭 Roles', value: roles.length > 1024 ? roles.substring(0, 1020) + '...' : roles, inline: false }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};