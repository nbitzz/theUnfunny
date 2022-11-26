let {ChatInputCommandInteraction} = require("discord.js")
let config = require(process.cwd()+"/config.json")
let axios = require("axios")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction) {
    return new Promise(async (resolve,reject) => {
            axios.get("https://pipedapi.kavin.rocks/channel/UCDwzLWgGft47xQ30u-vjsrg").then(async (data) => {
                let arrs = []

                arrs.push(data.data.relatedStreams.map((vid) => {
                    return {name:vid.title,image:vid.thumbnail}
                }))

                let lastNextPage = data.data.nextpage
                
                while (true) {
                    let np = JSON.parse(lastNextPage)
                    np.url = np.url.split("&")[0]
                    let dat = await axios.get(`https://pipedapi.kavin.rocks/nextpage/channel/UCDwzLWgGft47xQ30u-vjsrg?nextpage=${encodeURI(JSON.stringify(np))}`)
                    lastNextPage = dat.data.nextpage
                    arrs.push(dat.data.relatedStreams.map((vid) => {
                        return {name:vid.title,image:vid.thumbnail}
                    }))
                    if (dat.data.relatedStreams.length < 30) {
                        break
                    }
                }
                resolve(JSON.stringify([].concat(...arrs)))
            }).catch(reject)
    })
}