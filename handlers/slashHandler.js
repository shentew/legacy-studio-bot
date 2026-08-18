const { readdirSync } = require("node:fs");

module.exports = {
    async loadSlash(client) {

        const commands = [];

        for (const category of readdirSync("./slashcommands")) {
            
            const files = readdirSync(`./slashcommands/${category}`)
                .filter(file => file.endsWith(".js"));

            for (const file of files) {
                
                const command = require(`../slashcommands/${category}/${file}`);

                client.slashCommands.set(command.data.name, command);
                commands.push(command.data.toJSON());
            }   
        }

        await client.application.commands.set(commands);

        console.log("Slash commands cargados correctamente")
    },
};