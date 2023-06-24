let {ChatInputCommandInteraction, resolveColor} = require("discord.js")
let fs = require("fs/promises")

let video_files = [
    "mori.js",
    "avocado.js",
    "roblox.js",

    "everything.js",
    "characters.js",
    "everythingnsfw.js"
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

        let everything_arr = []

        await interaction.editReply({
            embeds:[{description:"Reading premade lists",color:resolveColor("Blurple")}]
        })

        meta.filter(e => e.type=="json" && !e.nsfw).forEach((e) => {
            everything_arr.push(require(assetPath+"json/"+e.file))
        })

        let generated = meta.filter(e => e.type=="generator" && !video_files.find(a => a == e.file) && e.file != "allpokemon.js" && !e.nsfw)
        for (let i = 0; i < generated.length; i++) {
            let e = generated[i]

            await interaction.editReply({
                embeds:[{description:`Generating list "${e.name}"`,color:resolveColor("Blurple")}]
            })
            
            everything_arr.push(JSON.parse(await require(assetPath+"generators/"+e.file)(interaction,a,b).catch(() => {interaction.followUp(`Warning: list "${e.name}" failed generation. It is recommended that you restart.`);return "[]"})))
        }

        resolve(JSON.stringify([].concat(...everything_arr)))
    })
}