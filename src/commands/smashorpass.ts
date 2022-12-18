import fs from "fs/promises"
import { EmbedBuilder, SlashCommandBuilder, PermissionsBitField, ActionRowBuilder, SelectMenuBuilder, ComponentType, TextChannel, GuildMember, ChatInputCommandInteraction, GuildTextBasedChannel, ButtonBuilder, ButtonStyle, ColorResolvable, PermissionFlagsBits, AttachmentBuilder, VoiceChannel, NewsChannel } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { EZSave, getSave } from "../lib/ezsave"
import { Logger } from "../lib/logger"

let csle = new Logger("smashorpass","commands")

/*
    This code is pretty bad.
    I might rewrite it later.

    2022-12-14: nsfw lists are kinda badly implemented.
                maybe do a better implementation later?
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
    file:string,
    nsfw?:boolean,
    description?:string
}

interface Frame {
    name:string,
    image:string
}

interface Scores {
    smash:number,
    pass:number
}

enum Result {
    Smash,
    Pass,
    Skipped
}

interface FrameLog {
    name:string,
    result:Result,
    time:number
}

interface GameSave {
    log:FrameLog[],
    meta:Meta,
    position:number,
    frames:Frame[]
    scores:Scores,
    timeSoFar:number
}

// bad type guard but i'm too lazy to care

let isGameSave = (a:any):a is GameSave => {return true}

// save

let saves:EZSave<GameSave> = getSave(process.cwd()+"/.data/smashorpass.json")

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

function getFinishEmbed(color:ColorResolvable,type:string,title:string,image:string,footer:string,score:Scores,ms:number) {
    return new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setThumbnail(image)
        .setDescription(`🟩 Smash **${score.smash}**  🟥 Pass **${score.pass}**`)
        .setFooter({text:footer})
        .setAuthor({name:`${type} in ${Math.floor(ms/10)/100}s`})
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
                        .setCustomId("sop.save")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("💾"),
                    new ButtonBuilder()
                        .setCustomId("sop.quit")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("🚪")
                )
        ]
    })

    return new Promise((resolve,reject) => {
        let answered = false
        let stamp = Date.now()

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
                    }).catch((err) => {
                        csle.error("Failed to edit message.")
                        console.error(err)
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
                                    frame.name,frame.image,footer,{smash:scores.smash+1,pass:scores.pass},Date.now()-stamp
                                )
                            ],
                            components:[]
                        }).catch((err) => {
                            csle.error("Failed to edit message.")
                            console.error(err)
                        })
                        resolve("smash")                        
                    break
                    case "sop.pass":
                        sopF.edit({
                            embeds:[
                                getFinishEmbed(
                                    "Red",
                                    "Pass!",
                                    frame.name,frame.image,footer,{smash:scores.smash,pass:scores.pass+1},Date.now()-stamp
                                )
                            ],
                            components:[]
                        }).catch((err) => {
                            csle.error("Failed to edit message.")
                            console.error(err)
                        })
                        resolve("pass")                        
                    break
                    case "sop.save":
                        answered=true
                        coll.stop()
                        sopF.edit({
                            embeds: [{description:"💾 Game saved. Your save will expire in 24 hours.",color:0xFF0000}],
                            components:[]
                        }).catch((err) => {
                            csle.error("Failed to edit message.")
                            console.error(err)
                        })
                        resolve("save")                    
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
                        frame.name,frame.image,footer,scores,20000
                    )
                ],
                components:[]
            }).catch((err) => {
                csle.error("Failed to edit message.")
                console.error(err)
            })

            resolve("skip")
        })
    })
}

async function SOPGame(game:Frame[],interaction:ChatInputCommandInteraction,listMeta:Meta,save?:GameSave):Promise<{score:Scores,gameBegin:number,gameLog:FrameLog[],noDisplayMessage:boolean}> {
    let gameBegin = Date.now()
    let gameOwnerTemp = interaction.member
    let channel = interaction.channel
    let gameLog:FrameLog[] = []

    if (!gameOwnerTemp || !channel || channel.isDMBased()) return {score:{smash:0,pass:0},gameBegin:Date.now(),gameLog:[],noDisplayMessage:true}

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
    let skipsInARow = 0;
    let noDisplayMessage = false

    if (save) {
        gameBegin = Date.now()-save.timeSoFar
        gameLog = save.log
        score = save.scores
    }

    for (let i = save?save.position:0; i < game.length; i++) {
        let frame = game[i]
        let d = Date.now()
        let decision = await SOPFrame(frame,gameOwner,channel,`${i+1}/${game.length}`,score)
        
        switch(decision) {
            case "smash":
                skipsInARow = 0
                score.smash++
                gameLog.push({
                    name:frame.name,
                    result:Result.Smash,
                    time:Date.now()-d
                })
            break
            case "pass":
                skipsInARow = 0
                score.pass++
                gameLog.push({
                    name:frame.name,
                    result:Result.Pass,
                    time:Date.now()-d
                })
            break
            case "quit":
                quit = true
            break;
            case "save":
                saves.set_record(interaction.user.id,{position:i,frames:game,meta:listMeta,scores:score,log:gameLog,timeSoFar:Date.now()-gameBegin},Date.now()+(1000*60*60*24))
                
                noDisplayMessage = true
                quit = true
            break;
            case "skip":
                skipsInARow++
                gameLog.push({
                    name:frame.name,
                    result:Result.Skipped,
                    time:20000
                })
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

    return {score:score,gameBegin:gameBegin,gameLog:gameLog,noDisplayMessage:noDisplayMessage}
}

command.action = async (interaction) => {
    if (!interaction.channel || !interaction.guild) return
    if (interaction.channel.isDMBased()) return
    if (interaction.channel.isThread()) {
        interaction.editReply("do this in a channel not a thread please kthxbye")
        return
    }

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

    let sav = saves.data[interaction.user.id]
    let seconds = sav ? Math.floor(sav.timeSoFar/1000) : 0
    let expirMin = sav ? Math.floor((saves.metadata[interaction.user.id].expire-Date.now())/60000) : 0
    let chnl:TextChannel|VoiceChannel|NewsChannel = interaction.channel

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
                            ...meta.filter((v:Meta) => chnl.nsfw || !v.nsfw).map((e:Meta) => {
                                return {
                                    label:e.name,
                                    emoji:e.emoji,
                                    description:`${e.description||""}${e.description?" | ":""}${(e.type == "json" ? "Premade" : "Generated")} | ${e.shuffle ? "Shuffled" : "Not shuffled"} | ${e.file}`,
                                    value:`${e.type}:${e.file}`,
                                }
                            }),
                            // god bless any poor soul who tries to understand this
                            ...((sav) ? (
                                sav.meta.nsfw && !chnl.nsfw ? [{
                                    label:`Continue NSFW list "${sav.meta.name}"`,
                                    description:`Move to an 18+ channel to continue | expires in ${Math.floor(expirMin/60)}h ${expirMin%60}m`,
                                    emoji:"⚠",
                                    value:"save"
                                }] : [{
                                    label:`Continue list "${sav.meta.name}"`,
                                    description:`${sav.position+1}/${sav.frames.length} (${Math.floor((sav.position/sav.frames.length)*100)}%) | ${Math.floor(seconds/60)}m ${seconds%60}s | expires in ${Math.floor(expirMin/60)}h ${expirMin%60}m`,
                                    emoji:"💾",
                                    value:"save"
                                }]
                            ) : []),
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

            // save implementation is a mess but all of this code is soooo
            if (type == "json") {
                prom = fs.readFile(`${command.assetPath}json/${file}`)
            } else if (type == "save") {
                if (!sav) {
                    interaction.editReply({
                        embeds:[{color:0xff0000,description:"No savedata found"}]
                    })
                    return
                }

                if (sav.meta.nsfw && !chnl.nsfw) {
                    interaction.editReply({
                        embeds:[{color:0xff0000,description:"To continue, please run /smashorpass in a NSFW channel."}]
                    })
                    return
                }
                prom = new Promise((resolve,reject) => {
                    resolve(JSON.stringify(sav.frames))
                })
            } else {
                prom = require(`${command.assetPath}generators/${file}`)(interaction)
            }

            let mt:Meta = type != "save" ? meta.find((e:Meta) => e.type == type && e.file == file) : {name:sav.meta.name}
            
            prom.then((buf) => {
                
                let game = JSON.parse(buf.toString())
                if (!mt) return

                if (mt.shuffle) {
                    shuffle(game)
                }

                SOPGame(game,interaction,mt,type == "save" ? sav : undefined).then((sc) => {
                    if (sc.noDisplayMessage) return
                    let score = sc.score
                    let seconds = Math.floor((Date.now()-sc.gameBegin)/1000)
                    let dt = new Date()

                    interaction.channel?.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle(`Smash or Pass! - "${mt.name}"`)
                                .setColor("Blurple")
                                .addFields(
                                    {name:"Smash",value:score.smash.toString(),inline:true},
                                    {name:"Pass",value:score.pass.toString(),inline:true},
                                    // ${seconds%60<10 ? "0" : ""}
                                    {name:"Time",value:`${Math.floor(seconds/60)}m ${seconds%60}s`,inline:true}
                                )
                        ],
                        files:[
                            new AttachmentBuilder(Buffer.from(`Smash or Pass - "${mt.name}"\nPlayed by ${interaction.user.tag} on ${dt.getUTCMonth()+1}/${dt.getUTCDate()}/${dt.getUTCFullYear()} (MM/DD/YY, UTC)\nhttps://github.com/nbitzz/theUnfunny\n${"-".repeat(40)}\nTotal Smashes | ${score.smash}\nTotal Passes  | ${score.pass}\nTotal         | ${sc.gameLog.length}\nTime          | ${Math.floor(seconds/60)}m ${seconds%60}s\n${"-".repeat(40)}\n`+(sc.gameLog.map((e) => {
                                let spTab = {
                                    [Result.Skipped]:"Skipped",
                                    [Result.Smash]:  "Smash! ",
                                    [Result.Pass]:   "Pass!  "
                                }
                                let time = `${Math.floor(e.time/10)/100}s`
                                return `${time+" ".repeat(6-time.length)} | ${spTab[e.result]} | ${e.name}`
                            }).join("\n"))))
                            .setName("smashorpass.txt")
                        ]
                    })
                })
            }).catch((err) => {
                interaction.editReply({embeds: [{description:"File read/list generation failed",color:0xFF0000}]})
                csle.error(`List generation failed for ${mt.file} ("${mt.name}")`)
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