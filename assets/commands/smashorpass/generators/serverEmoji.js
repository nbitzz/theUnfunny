let {ChatInputCommandInteraction} = require("discord.js")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction) {
    return new Promise((resolve,reject) => {
        if (interaction.guild) {
            interaction.guild.emojis.fetch().then((emojis) => {
                resolve(JSON.stringify(emojis.map((v) => {
                    return {name:`\\:${v.name}\\:`,image:v.url}
                })))
            }).catch(e => reject("failed to get emojis"))
        } else {
            reject('guild not found');
        }
    })
}