import fs from "fs/promises"
import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, SelectMenuBuilder, ComponentType, TextChannel, GuildMember, ChatInputCommandInteraction, GuildTextBasedChannel, ButtonBuilder, ButtonStyle, ColorResolvable, PermissionFlagsBits } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { title } from "process";

/*
    This code is pretty bad.
    I might rewrite it later.
*/

// change if selfhosting

let skipTimerGifURL = "https://media.discordapp.net/attachments/1044017023883157617/1044346468900814868/skipCount.gif"
let MAX_SKIPS_IN_A_ROW = 5

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("smashorpass")
        .setDescription("Smash or Pass?")
)

let meta = require(command.assetPath+"meta.json")

// classes

interface Meta {
    name:string,
    emoji:string,
    type:string,
    shuffle:boolean,
    file:string
}

interface Frame {
    name:string,
    image:string
}

interface Scores {
    smash:number,
    pass:number
}

// funcs

function shuffle(array:Array<any>) {
    var m = array.length, t, i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
  
    return array;
}

function getFinishEmbed(color:ColorResolvable,type:string,title:string,image:string,footer:string,score:Scores) {
    return new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setThumbnail(image)
        .setDescription(`🟩 Smash **${score.smash}**  🟥 Pass **${score.pass}**`)
        .setFooter({text:footer})
        .setAuthor({name:type})
}

function sleep(ms:number):Promise<void> {
    return new Promise((resolve,reject) => {
        setTimeout(() => {
            resolve()
        },ms)
    })
}

async function SOPFrame(frame:Frame,gameOwner:GuildMember,channel:GuildTextBasedChannel,footer:string,scores:Scores):Promise<string> {
    let sopF = await channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor("DarkRed")
                .setThumbnail(skipTimerGifURL)
                .setImage(frame.image)
                .setTitle(frame.name)
                .setAuthor({name:"Smash or Pass?"})
                .setFooter({text:footer})
        ],
        components: [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("sop.smash")
                        .setStyle(ButtonStyle.Success)
                        .setLabel("Smash"),
                    new ButtonBuilder()
                        .setCustomId("sop.pass")
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Pass"),
                    new ButtonBuilder()
                        .setCustomId("sop.quit")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("🚪")
                )
        ]
    })

    return new Promise((resolve,reject) => {
        let answered = false

        let coll = sopF.createMessageComponentCollector({
            componentType:ComponentType.Button,
            time:20000
        })

        coll.on("collect",async (int) => {
            if (int.user.id != gameOwner.user.id && int.customId != "sop.quit") {
                int.reply({
                    ephemeral:true,
                    embeds: [{description:"This prompt isn't yours!",color:0xFF0000}]
                })
                return
            } else if (int.customId == "sop.quit") {
                if (int.user.id == gameOwner.user.id || int.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    answered=true
                    coll.stop()
                    sopF.edit({
                        embeds: [{description:"You have either quit the game or a moderator has forcefully closed the session.",color:0xFF0000}],
                        components:[]
                    })
                    resolve("quit")
                    return
                } else {
                    int.reply({
                        ephemeral:true,
                        embeds: [{description:"You must have MANAGE_MESSAGES to forcefully close this game",color:0xFF0000}]
                    })
                }
                return
            } else {
                answered=true
                coll.stop()
                switch(int.customId) {
                    case "sop.smash":
                        sopF.edit({
                            embeds:[
                                getFinishEmbed(
                                    "Green",
                                    "Smash!",
                                    frame.name,frame.image,footer,{smash:scores.smash+1,pass:scores.pass}
                                )
                            ],
                            components:[]
                        })
                        resolve("smash")                        
                    break
                    case "sop.pass":
                        sopF.edit({
                            embeds:[
                                getFinishEmbed(
                                    "Red",
                                    "Pass!",
                                    frame.name,frame.image,footer,{smash:scores.smash,pass:scores.pass+1}
                                )
                            ],
                            components:[]
                        })
                        resolve("pass")                        
                    break
                }
            }
        })

        coll.on("end",() => {
            if (answered) return

            sopF.edit({
                embeds:[
                    getFinishEmbed(
                        "Greyple",
                        "Skipped",
                        frame.name,frame.image,footer,scores
                    )
                ],
                components:[]
            })

            resolve("skip")
        })
    })
}

async function SOPGame(game:Frame[],interaction:ChatInputCommandInteraction):Promise<Scores> {
    let gameOwnerTemp = interaction.member
    let channel = interaction.channel
    if (!gameOwnerTemp || !channel || channel.isDMBased()) return {smash:0,pass:0}

    let gameOwner = await channel.guild.members.fetch(gameOwnerTemp.user.id)

    interaction.editReply({
        embeds: [
            {title:"Begin!",color:0x00FF00}
        ],
        components:[]
    })

    let score:Scores = {
        smash:0,
        pass:0
    }

    let quit = false;
    let skipsInARow = 0

    for (let i = 0; i < game.length; i++) {
        let frame = game[i]
        let decision = await SOPFrame(frame,gameOwner,channel,`${i+1}/${game.length}`,score)
        
        switch(decision) {
            case "smash":
                skipsInARow = 0
                score.smash++
            break
            case "pass":
                skipsInARow = 0
                score.pass++
            break
            case "quit":
                quit = true
            break;
            case "skip":
                skipsInARow++
            break;
        }
        if (quit) break
        // use == instead of >= so that people
        // can set MAX_SKIPS_IN_A_ROW to -1
        // to disable it
        if (skipsInARow == MAX_SKIPS_IN_A_ROW) {
            channel.send({
                embeds: [{description:"Game closed for inactivity",color:0xFF0000}],
                components:[]
            })
            break
        }
    }

    return score
}

command.action = async (interaction) => {
    if (!interaction.channel || !interaction.guild) return
    if (interaction.channel.isDMBased()) return
    
    let me = await interaction.guild.members.fetchMe()
    if (!me.permissionsIn(interaction.channel).has(
        PermissionsBitField.Flags.SendMessages
    )) {
        interaction.editReply({embeds: [
            new EmbedBuilder()
                .setDescription("I don't have permission to send messages in this channel.")
                .setColor("Red")
        ]})
    }

    let repl = await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setTitle("Smash or Pass!")
                .setDescription("Please select a list.")
                .setColor("Red")
                .setThumbnail(skipTimerGifURL)
        ],
        components: [
            new ActionRowBuilder<SelectMenuBuilder>()
                .addComponents(
                    new SelectMenuBuilder()
                        .setOptions(
                            ...meta.map((e:Meta) => {
                                return {
                                    label:e.name,
                                    emoji:e.emoji,
                                    description:`${e.type == "json" ? "Premade" : "Generated"} | ${e.shuffle ? "Shuffled" : "Not shuffled"} | ${e.file}`,
                                    value:`${e.type}:${e.file}`
                                }
                            })
                        )
                        .setCustomId("list")
                        .setPlaceholder("Select a list...")
                )
        ]
    });

    let selectedList = false

    let coll = repl.createMessageComponentCollector({
        componentType:ComponentType.StringSelect,
        time:20000
    })

    coll.on("collect",async (int) => {
        if (int.user.id != interaction.user.id) {
            int.reply({
                ephemeral:true,
                embeds: [{description:"This prompt isn't yours!",color:0xFF0000}]
            })
            return
        } else {
            let listid = int.values[0]
            let type = listid.split(":")[0]
            let file = listid.split(":")[1]
            selectedList = true
            coll.stop()

            await interaction.editReply({
                embeds: [
                    {description:"Give me a sec... (reading file & generating game data)",color:0xFF0000}
                ],
                components:[]
            })

            let prom:Promise<string|Buffer>

            if (type == "json") {
                prom = fs.readFile(`${command.assetPath}json/${file}`)
            } else {
                prom = require(`${command.assetPath}generators/${file}`)(interaction)
            }

            prom.then((buf) => {
                let mt:Meta = meta.find((e:Meta) => e.type == type && e.file == file)
                let game = JSON.parse(buf.toString())
                if (!mt) return

                if (mt.shuffle) {
                    shuffle(game)
                }

                SOPGame(game,interaction).then((score) => {
                    interaction.channel?.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`Smash or Pass! - "${mt.name}"`)
                                .setColor("Blurple")
                                .addFields(
                                    {name:"Smash",value:score.smash.toString(),inline:true},
                                    {name:"Pass",value:score.pass.toString(),inline:true}
                                )
                        ]
                    })
                })
            }).catch((err) => {
                interaction.editReply({embeds: [{description:"File read failed",color:0xFF0000}]})
                console.error(err)
            })
        }
    })

    coll.on("end",() => {
        if (selectedList) return

        interaction.editReply({
            embeds:[{description:"You have run out of time. Please run /smashorpass again to make your selection.",color:0xff0000}],
            components:[]
        })
    })
}

module.exports = command