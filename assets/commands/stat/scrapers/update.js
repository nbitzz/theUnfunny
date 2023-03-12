let {ChatInputCommandInteraction} = require("discord.js")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction
 * @param {{[key:string]:any}} data 
 * @returns 
 */

module.exports = function(interaction,data) {
    return new Promise((resolve,reject) => {
        resolve(data.slice(0,3).map((e) => {
            return {
                name: `commit ${e.sha.slice(0,7)}`,
                value: `authored by [${e.author.login}](${e.author.html_url})\n${e.commit.author.date}\n\`\`${e.commit.message.split("\n")[0]}\`\`\n[view on GitHub](${e.html_url})`
            }
        }))
    })
}