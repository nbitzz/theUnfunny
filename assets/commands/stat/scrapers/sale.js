// scrape https://steamdb.info/sales/history

let {ChatInputCommandInteraction} = require("discord.js")
let {load,Cheerio} = require("cheerio")

let getV = (tags,type) => {
    // bad way of doing this but whatever
   return tags.find(e => e.children.find(a => a.name=="i" && a.children[0].data == type)).children.find(e => e.type == "text").data.trim()
}

/**
 * 
 * @param {ChatInputCommandInteraction} interaction
 * @param {{[key:string]:any}|Cheerio} data 
 * @returns 
 */

module.exports = function(interaction,data) {
    return new Promise((resolve,reject) => {
        let $ = load(data)

        let saleName = $('span[class="sale-name"]').text()
        let timeLeft = $('span[class="huge-countdown"]').text().replace(/ \: /g,":")

        resolve([
            {name:"Coming up...",value:`*${saleName}* in **${timeLeft}**`,inline:true},
        ])
    })
}