import axios from "axios";
import { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";

// you can change these if you're selfhosting and you want to torture your servers

let MAX_PAGES = 10

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .addStringOption(
            new SlashCommandStringOption()
                .setName("tags")
                .setDescription("R34 tag set to check")
                .setRequired(false)
        )
)

command.action = async (interaction) => {
    // todo: change this to use fs, maybe
    let defaultList = require(command.assetPath+"Defaults.json")
    let character:string = interaction.options.getString("tags",false) || defaultList[Math.floor(Math.random()*defaultList.length)]

    // contact rule34 api
    
    let count = 0

    for (let i = 0; i < MAX_PAGES; i++) {
        let res = await axios.get(`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=1000&tags=${encodeURI(character)}`)
        count += res.data.length
        if (res.data.length<1000) break
    }
    
    interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setTitle("/losefaith")
                .setColor("Red")
                .setDescription(`There are **${count}** result${count==1?"s":""} for \`\`${character.toLowerCase()}\`\` on rule34.xxx.`)
                .setFooter({
                    text:`Note: counts are capped at ${1000*MAX_PAGES} to reduce load`
                })
        ]
    })
}

module.exports = command