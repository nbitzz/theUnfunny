let {ChatInputCommandInteraction} = require("discord.js")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction) {
    return new Promise((resolve,reject) => {
        if (interaction.guild) {
            interaction.guild.members.fetch().then((members) => {
                resolve(JSON.stringify(members.map((v) => {
                    return {name:`${v.displayName}`,image:v.displayAvatarURL({size:256})}
                })))
            }).catch(e => reject("failed to get members"))
        } else {
            reject('guild not found');
        }
    })
}