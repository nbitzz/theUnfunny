const axios = require("axios");
let {ChatInputCommandInteraction} = require("discord.js")

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction) {
    return new Promise((resolve,reject) => {
        axios.get("https://games.roblox.com/v1/games/sorts?model.gameSortsContext=GamesDefaultSorts").then((data) => {
            var token = data.data.sorts.find(x => x.displayName === "Featured").token

            axios.get(`https://games.roblox.com/v1/games/list?model.sortToken=${token}`).then(async (datax) => {
                // i'm tired so i'm doing this to save me trouble
                // in case map and async does the funny
                // like with foreach and async

                let games = datax.data.games
                let map = []

                for (let i = 0; i < games.length; i++) {
                    let v = games[i]

                    let dataxx = await axios.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${v.placeId}&size=384x216&format=Png&isCircular=false`).catch(reject)
                    map.push({name:v.name,image:dataxx.data.data[0].imageUrl})
                } 

                resolve(JSON.stringify(map))
            }).catch(reject)
        }).catch(reject)
    })
}
