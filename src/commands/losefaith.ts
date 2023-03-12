import axios from "axios";
import { EmbedBuilder, SlashCommandBooleanOption, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { fetchPostCountForTag } from "../lib/rule34"
import { EZSave, getSave } from "../lib/ezsave";

// you can change these if you're selfhosting i guess

let MAX_PAGES = 10
let save:EZSave<HistoryFrame[]> = getSave(`${process.cwd()}/.data/taghistory.json`)

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("losefaith")
        .setDescription("Get the amount of results for a set of rule34.xxx tags")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("tags")
                .setDescription("R34 tag set to check")
                .setRequired(false)
        )
        .addBooleanOption(
            new SlashCommandBooleanOption()
                .setName("fast")
                .setDescription("Whether or not to scrape from tags page (default: true, will be disabled when using more than 1 tag)")
                .setRequired(false)
        )
)

let fetchPostCountForTagViaApi = async function(character:string) {
    // contact rule34 api
    
    let count = 0

    for (let i = 0; i < MAX_PAGES; i++) {
        let res = await axios.get(`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=1000&tags=${encodeURIComponent(character)}&pid=${i}`)
        count += res.data.length
        if (res.data.length<1000) break
    }

    return count
}

interface HistoryFrame {
    time  : number
    count : number
}

command.allowInDMs = true

command.action = async (interaction) => {
    // todo: change this to use fs, maybe
    let defaultList : string[] = require(command.assetPath+"Defaults.json")
    let character   : string   = interaction.options.getString("tags",false) || defaultList[Math.floor(Math.random()*defaultList.length)]
    let fast        : boolean  = (character.split(" ").length<=1) ? (interaction.options.getBoolean("fast",false) ?? true) : false

    let count   = await (fast ? fetchPostCountForTag : fetchPostCountForTagViaApi)(character)
    let history = fast ? save.data[character.toLowerCase()] : null

    let last_checked_txt = fast ? `Last checked ${history ? new Date((history[history.length-1] || {time:0}).time).toUTCString() : "never"} with ${history ? (history[history.length-1] || {}).count : "?"} posts` : null

    interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setTitle("/losefaith")
                .setColor("Blurple")
                .setDescription(`There ${count==1?"is":"are"} **${count}** result${count==1?"":"s"} for \`\`${character.toLowerCase()}\`\` on rule34.xxx.`)
                .setFooter({
                    text:
                        last_checked_txt||`Note: counts are capped at ${1000*MAX_PAGES} to reduce load`
                })
        ]
    })

    if (fast) {
        if (!history) history = []
        /*let last = history[history.length-1]
        if (!last || count != last.count)*/
        history.push({count:count,time:Date.now()})
        //else if (count == last.count) history[history.length-1].time = Date.now()
        save.set_record(character.toLowerCase(),history)
    }
}

module.exports = command