let {ChatInputCommandInteraction} = require("discord.js")

// todo: make fetching data from a server optional
//       so we don't need to make this pointless get request
//       to example.com

/**
 * 
 * @param {ChatInputCommandInteraction} interaction
 * @param {{[key:string]:any}} data 
 * @returns 
 */

module.exports = function(interaction,data) {
    return new Promise(async (resolve,reject) => {
        let expirMin = Math.floor(process.uptime()/60)

        resolve([
            {
                name: "Uptime",
                value: `\`\`${Math.floor(process.uptime()*1000)}\`\`\nHours & mins: ${Math.floor(expirMin/60)}h ${expirMin%60}m`,
                inline: true
            },
            {
                name: "Guilds",
                value: `In ${Array.from((await interaction.client.guilds.fetch()).values()).length.toString()} guilds`,
                inline: true
            }
        ])
    })
}