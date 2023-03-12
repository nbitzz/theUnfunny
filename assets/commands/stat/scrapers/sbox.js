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

        let tags = $('span[class="tag"]').toArray()

        // this is probably unnecessary
        let keys = getV(tags,"key")
        let time = getV(tags,"schedule")
        let entered = getV(tags,"people")
        let watching = getV(tags,"visibility")

        resolve([
            {name:"People",value:`**${entered}** users in DPTS raffle\n**${watching}** users watching page`,inline:true},
            {name:"This Raffle",value:`**${keys}** keys available\n(${((keys/entered)*100).toString().slice(0,7)}% win chance)\n**${time}** left`,inline:true}
        ])
    })
}