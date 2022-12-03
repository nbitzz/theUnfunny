let {ChatInputCommandInteraction} = require("discord.js")
let axios = require("axios")
let {load} = require("cheerio")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction) {
    return new Promise((resolve,reject) => {
        if (interaction.guild) {
            axios.get("https://asset.party/get/developer/preview").then(data => {
                let $ = load(data.data)

                resolve(JSON.stringify($('div[class="is-flex is-wrap"]').children().toArray().map((el) => {
                    return {name:el.attribs.title||"err",image:el.attribs.src}
                })))
            }).catch(reject)
        } else {
            reject('guild not found');
        }
    })
}