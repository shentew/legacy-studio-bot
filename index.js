const { Client, ActivityType, Collection } = require("discord.js")
const client = new Client({intents:53608447})
require("dotenv").config({ quiet: true })

client.slashCommands = new Collection();

require("./handlers/eventHandler").loadEvents(client)

client.once("clientReady", async () => {
    console.log(`Bot Encendido Como: ${client.user.tag}`)

    client.user.setActivity(`Legacy Studio`, {
        type: ActivityType.Watching
    });

    await require("./handlers/slashHandler").loadSlash(client);

    // 👇 PASAMOS EL CLIENTE AL DASHBOARD 👇
    require("./dashboard.js")(client);
})

client.login(process.env.TOKEN)