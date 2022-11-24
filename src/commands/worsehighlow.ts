import axios from "axios";
import { ActionRowBuilder, ComponentType, EmbedBuilder, SelectMenuBuilder, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";

// i don't know why but this code turned out
// horrible

// change if selfhosting

let skipTimerGifURL = "https://media.discordapp.net/attachments/1044017023883157617/1044346468900814868/skipCount.gif"

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("worsehighlow")
        .setDescription("A game of high/low, but with rule34 tags")
)

command.allowInDMs = true

let terms = require(command.assetPath+"terms.json")

command.action = async (interaction) => {
    let picks:string[] = terms.map((e:string)=>e)
    let left = picks.splice(Math.floor(Math.random()*picks.length),1)[0]
    let right = picks.splice(Math.floor(Math.random()*picks.length),1)[0]

    let repl = await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setAuthor({name:"High/Low"})
                .setDescription(`Does **${left}** have more results on *rule34.xxx* than **${right}**?`)
                .setColor("Blurple")
                .setThumbnail(skipTimerGifURL)
        ],
        components: [
            new ActionRowBuilder<SelectMenuBuilder>()
                .addComponents(
                    new SelectMenuBuilder()
                        .addOptions(
                            {
                                value:"yes",
                                label:"Yes!",
                                description:`${left} has more results than ${right}`,
                                emoji:`🟢`
                            },
                            {
                                value:"no",
                                label:"Nope.",
                                description:`${left} has less results than ${right}`,
                                emoji:`🔴`
                            }
                        )
                        .setCustomId("sel")
                        .setPlaceholder("Select an answer...")
                )
        ]
    })

    let coll = repl.createMessageComponentCollector({
        componentType:ComponentType.StringSelect,
        time:20000
    })

    let answer = "none"

    coll.on("collect",(int) => {
        if (int.user.id != interaction.user.id) {
            int.reply(
                {embeds:[{description:"This isn't your prompt!",color:0xff0000}]}
            )
        } else {
            answer = int.values[0]
            coll.stop()
        }
    })
    
    coll.on("end",async () => {
        if (answer == "none") {
            interaction.editReply({components:[],embeds:[new EmbedBuilder().setColor("Greyple").setDescription("fuk yoy answer the ques tion")]})
        } else {
            let results_left = parseInt((await axios.get(`https://r34-json-api.herokuapp.com/tags?name=${encodeURI(left)}`)).data[0].posts,10)
            let results_right = parseInt((await axios.get(`https://r34-json-api.herokuapp.com/tags?name=${encodeURI(right)}`)).data[0].posts,10)
            
            let user_answer = answer=="yes"
            let truth = results_left>results_right

            let trolling = new EmbedBuilder()
                                .addFields(
                                    {
                                        name:"Results",
                                        value:`You answered: **${answer}**\nResults for \`\`${left}\`\`: ${results_left}\nResults for \`\`${right}\`\`: ${results_right}`
                                    }
                                )

            if (user_answer == truth) {
                trolling
                    .setColor("Green")
                    .setDescription(`You're correct!`)
            } else {
                trolling
                    .setColor("Red")
                    .setDescription(`Congratulations! You answered wrong.`)
            }

            interaction.editReply({
                embeds:[trolling],
                components:[]
            })
        }
    })
}

module.exports = command