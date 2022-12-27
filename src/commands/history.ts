import { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { EZSave, getSave } from "../lib/ezsave";

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

    interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor("Blurple")
                .setTitle(tag)
                .setDescription(
                    (save.data[tag] || []).map(v => 
                               // bad way of doing this but i don't care anymore
                        `\`\`${new Date(v.time).toISOString().split(".")[0].replace("T"," ")} UTC\`\` — **${v.count}**`    
                    ).join("\n") || "There's no history for this tag. Use /losefaith to generate some history."
                )
        ]
    })
}

module.exports = command