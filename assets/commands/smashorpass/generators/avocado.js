let {ChatInputCommandInteraction} = require("discord.js")
let config = require(process.cwd()+"/config.json")
let axios = require("axios")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction) {
    return new Promise((resolve,reject) => {
        if (config.invidious) {
            axios.get(config.invidious+"/api/v1/channels/UCDwzLWgGft47xQ30u-vjsrg/videos").then((data) => {
                resolve(JSON.stringify(data.data.map((vid) => {
                    return {name:vid.title,image:(vid.videoThumbnails[0] || {url:""}).url}
                })))
            }).catch(reject)
        } else {
            reject("No config.invidious set")
        }
    })
}