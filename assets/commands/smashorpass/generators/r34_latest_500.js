let {ChatInputCommandInteraction} = require("discord.js")
let axios = require("axios")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction) {
    return new Promise((resolve,reject) => {

        axios.get("https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=500&tags=").then((data) => {
            resolve(JSON.stringify(data.data.map((v) => {
                return {name:v.tags.length > 256 ? `PostID: ${v.id}` : v.tags,image:v.file_url}
            })))
        })
    })
}