const { readdirSync } = require("node:fs");

module.exports = {

    async loadEvents(client) {

        readdirSync(process.cwd() + "/events")
            .filter(file => file.endsWith(".js"))
            .forEach(file => {

                const event = require(process.cwd() + `/events/${file}`);

                if (event.once) {

                    client.once(event.name, (...args) =>
                        event.execute(...args, client)
                    );

                } else {

                    client.on(event.name, (...args) =>
                        event.execute(...args, client)
                    );

                }

            });
    }
};