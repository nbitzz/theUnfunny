let {ChatInputCommandInteraction} = require("discord.js")
let axios = require("axios")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction) {
    return new Promise(async (resolve,reject) => {
            axios.get("https://unusann.us/api/v1/gets01metadata").then(async (data) => {
                resolve(JSON.stringify(data.data.map((v) => {
                    return {name:v.title,image:"https://cdn.unusannusarchive.tk/"+((v.posters?(v.posters.find(e => e.type == "image/jpeg") || v.posters[0]).src:v.thumbnail)||"/thumbnails/00/001.jpg")}
                })))
            }).catch(reject)
    })
}