let {ChatInputCommandInteraction, resolveColor} = require("discord.js")
let fs = require("fs/promises")

let pokemon = [
    "pokemon.json",
    "pokemon_gen2.json",
    "pokemon_gen3.json",
    "pokemon_gen4to8.json",
    "pokemon_gen9.json"
]

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */

module.exports = function(interaction,a,b) {
    return new Promise(async (resolve,reject) => {
        let assetPath = process.cwd()+"/assets/commands/smashorpass/"
        
        let mt_tmp = await fs.readFile(assetPath+"meta.json")
        let meta = JSON.parse(mt_tmp.toString())

        let pokemon_lists = []

        await interaction.editReply({
            embeds:[{description:"Reading...",color:resolveColor("Blurple")}]
        })

        meta.filter(e => e.type=="json" && pokemon.includes(e.name)).forEach((e) => {
            pokemon_lists.push(require(assetPath+"json/"+e.file))
        })

        resolve(JSON.stringify([].concat(...everything_arr)))
    })
}