const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('encuesta')
        .setDescription('Crea una encuesta con reacciones')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option => 
            option.setName('pregunta')
                  .setDescription('La pregunta de la encuesta')
                  .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('opcion1')
                  .setDescription('Primera opción')
                  .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('opcion2')
                  .setDescription('Segunda opción')
                  .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('opcion3')
                  .setDescription('Tercera opción (opcional)')
                  .setRequired(false)
        )
        .addStringOption(option => 
            option.setName('opcion4')
                  .setDescription('Cuarta opción (opcional)')
                  .setRequired(false)
        ),

    async execute(interaction) {
        const pregunta = interaction.options.getString('pregunta');
        const opciones = [
            interaction.options.getString('opcion1'),
            interaction.options.getString('opcion2'),
            interaction.options.getString('opcion3'),
            interaction.options.getString('opcion4')
        ].filter(op => op !== null);

        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
        
        let description = opciones.map((op, i) => `${emojis[i]} ${op}`).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#a855f7')
            .setTitle(`📊 Encuesta`)
            .setDescription(`**${pregunta}**\n\n${description}`)
            .setFooter({ text: `Encuesta creada por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });

        // Agregar reacciones automáticamente
        for (let i = 0; i < opciones.length; i++) {
            await message.react(emojis[i]);
        }
    },
};