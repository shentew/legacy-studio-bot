const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Muestra el avatar de un usuario')
        .addUserOption(option => 
            option.setName('usuario')
                  .setDescription('El usuario del cual quieres ver el avatar')
                  .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        
        const embed = new EmbedBuilder()
            .setColor('#a855f7')
            .setTitle(`🖼️ Avatar de ${user.tag}`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};