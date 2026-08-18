const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Muestra la latencia del bot."),

    async execute(interaction) {

        const ping = Date.now() - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor("DarkRed")
            .setDescription(`Ping del bot: **${ping}ms**`);

        await interaction.reply({ embeds: [embed] });
    }
};