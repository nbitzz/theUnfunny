let {ChatInputCommandInteraction} = require("discord.js")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction,control,share) {
    return new Promise(async (resolve,reject) => {
            let things = share.get("Things")
            await things.ready()

            let tagCache = {}
            let mapped = []

            for (e of Object.values(things.getSubmissions())) {
                let userTag = tagCache[e.author] || await interaction.client.users.fetch(e.author).then((user) => user.tag).catch(() => "❔")

                if (!tagCache[e.author]) tagCache[e.author] = userTag

                mapped.push({
                    name:e.data.name,
                    image:e.data.image,
                    description:`submitted by ${userTag}`
                })
            }

            resolve(JSON.stringify(mapped))
    })
}