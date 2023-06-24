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
                resolve(JSON.stringify(data.data.map((v,x) => {
                    //https://unusann.us/_next/image?url=https%3A%2F%2Fstream.unusann.us%2Fthumbnails%2F01%2F001.webp&w=3840&q=100
                    //return {name:v.title,image:"https://cdn.unusannusarchive.tk/"+((v.posters?(v.posters.find(e => e.type == "image/jpeg") || v.posters[0]).src:v.thumbnail)||"/thumbnails/00/001.jpg")}
                    return {name:v.title, image: `https://unusann.us/_next/image?url=https%3A%2F%2Fstream.unusann.us%2Fthumbnails%2F01%2F${`000`.slice(-(3-(x+1).toString().length))||3}${(x+1)}.webp&w=1920&q=100` }
                })))
            }).catch(reject)
    })
}