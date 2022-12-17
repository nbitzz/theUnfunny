let {ChatInputCommandInteraction} = require("discord.js")
let {load,Cheerio} = require("cheerio")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction
 * @param {{[key:string]:any}|Cheerio} data 
 * @returns 
 */

module.exports = function(interaction,data) {
    return new Promise((resolve,reject) => {
        let $ = load(data)

        // 2022-12-16
        // This Code Makes So Much Sense!
        //                         -split

        let countBase = $('div[style] > p > a')
            .parent()
            .text()
            .replace("Serving","")
            .replace("posts - Running Gelbooru Beta 0.2","")
            .trim()

        resolve([
            {
                name:"Post count",
                value:`**${countBase}** posts\n\`\`${countBase.replace(/\,/g,"")}, ${countBase.replace(/\,/g,"_")}\`\``,
                inline:true
            }
        ])
    })
}