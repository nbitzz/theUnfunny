import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { EZSave, getSave } from "../lib/ezsave";
import { fetchPostCountForTag } from "../lib/rule34";

// init slash command
let save:EZSave<HistoryFrame[]> = getSave(`${process.cwd()}/.data/taghistory.json`)

interface HistoryFrame {
    time  : number
    count : number
}

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("history")
        .setDescription("View losefaith history for a tag. History is shared between servers.")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("tag")
                .setDescription("Tag to check")
                .setRequired(true)
        )
)

command.action = async (interaction) => {
    let tag = interaction.options.getString("tag",true)
    if (tag.split(" ").length > 1) {
        interaction.editReply("/history does not support the usage of multiple tags.")
        return
    } 

    let count = await fetchPostCountForTag(tag)

    let tagHist = (save.data[tag.toLowerCase()] || [])
    let last = tagHist[tagHist.length-1]
    if (!last || last.count != count) {
        tagHist.push({count:count,time:Date.now()})
        save.set_record(tag.toLowerCase(),tagHist)
    }

    // i'm tired so my math here is likely very, VERY wrong
    /*
    let oldest = tagHist[0]
    let latest = tagHist[tagHist.length-1]
    let posts_day = tagHist.length > 1 ? Math.floor((latest.count - oldest.count)/((latest.time-oldest.time)/(24*60*60*1000))) : "?"
    */

    interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor("Blurple")
                .setAuthor({name:"latest 10 checks"})
                .setTitle(tag.toLowerCase())
                /*.addFields(
                    {name:`Avg posts/day [based on oldest chk & now]`,value:`${posts_day == Infinity ? "?" : posts_day} posts/day`}
                )*/
                .setDescription(
                    tagHist.slice(-10).map(v => 
                               // bad way of doing this but i don't care anymore
                        `\`\`${new Date(v.time).toISOString().split(".")[0].replace("T"," ")} UTC\`\` — **${v.count}** (<t:${Math.floor(v.time/1000)}:R>)`    
                    ).join("\n") || "There's no history for this tag."
                )
        ],
        files: [
            new AttachmentBuilder(Buffer.from(`Tag history for ${tag.toLowerCase()}\nhttps://github.com/nbitzz/theUnfunny\n${"-".repeat(40)}\n${tagHist.map(v => 
                   // bad way of doing this but i don't care anymore
                `${new Date(v.time).toISOString().split(".")[0].replace("T"," ")} UTC — ${v.count}`    
            ).join("\n") || "There's no history for this tag."}`))
            .setName(`${tag.toLowerCase()}.txt`)
        ]
    })
}

module.exports = command