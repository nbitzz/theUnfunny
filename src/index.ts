// i get that you shouldn't be doing thiss
// but i'm tired so like ehh

import { Logger, Groups, use } from "./lib/logger"
new Groups.LoggerGroup("Library","0,255,150")

import fs from "fs/promises"
import Discord, { ActionRowBuilder, APIApplicationCommand, Client, EmbedBuilder, IntentsBitField, StringSelectMenuBuilder, TextInputBuilder } from "discord.js"
import { SlashCommandManager, isSlashCommand } from "./lib/SlashCommandManager"
import { CommandAndControl } from "./lib/CommandAndControl"
import { operatorMenuDisplay, operatorMenuOptions } from "./lib/control/operatorMenu"
import { ModeratedSubmissionSystem, Systems } from "./lib/ModeratedSubmissionFramework"
import startApi from "./lib/api/api"
import { ChannelManagerController } from "./lib/managers"

let csle = new Logger("theUnfunny")


let client = new Client({
    intents: [
        /* todo: probably justify some of these intents */
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMembers
    ]
})

let _config:{
    token:string,
    monofile: string,
}

let control:CommandAndControl
let commands:SlashCommandManager
let sts:ModeratedSubmissionSystem<{activity:string,name:string}>
                                  // ts wont let me use omit here
let activityTypeMap:{[key:string]:Discord.ActivityType.Playing|Discord.ActivityType.Watching|Discord.ActivityType.Listening} = {
    Playing: Discord.ActivityType.Playing,
    Watching: Discord.ActivityType.Watching,
    Listening: Discord.ActivityType.Listening
}

let statuses:{activity:string,name:string}[] = [
    {
        activity:"Watching",
        name:"you"
    }
]

// bad way of doing this, blah blah blah

let switchStatus = () => {
    let _sts = statuses.concat(sts.getSubmissions().map(e => e.data))
    let picked = _sts[Math.floor(Math.random()*_sts.length)]
    client.user?.setPresence({
        activities:[
            {
                type:activityTypeMap[picked.activity],
                name:picked.name
            }
        ],
        status:Discord.PresenceUpdateStatus.Online
    })
}

client.on("ready",async () => {
    if (!client.user) return 
    
    csle.info(`Hi, I'm ${client.user.tag}.`)
    csle.log (`Initializing Command and Control center...`)
    
    control = new CommandAndControl(client)
    await control.ready()

    if (!control.isSetup) {
        client.user.setPresence({
            activities:[{
                type:Discord.ActivityType.Playing,
                name:"I need an owner~ uwu (Setup not completed. Please check your terminal for further instruction.)"
            }],
            status:Discord.PresenceUpdateStatus.Idle
        })
        
        csle.warn(`Your Command & Control center has not been set up.`)
        csle.info("Please wait for setup to begin.")
        // setup code here
        await control.setup()
    }

    await client.user.setPresence({
        activities:[{
            type:Discord.ActivityType.Playing,
            name:"Starting theUnfunny..."
        }],
        status:Discord.PresenceUpdateStatus.Idle
    })

    csle.success(`Command & Control center is set up!`)
    commands = new SlashCommandManager(client,control)
    
    let bot_logs_channel = await control.getChannel("bot-logs")

    let colorTable:{[key:string]:string} = {
        info   : "79b8ff",
        log    : "949494",
        error  : "f97583",
        success: "85e89d",
        warning: "ffea7f"
    }

    use({
        log: (logger,type,content) => {
            bot_logs_channel.send({
                embeds:[
                    new EmbedBuilder()
                        .setTitle(`${logger.group ? logger.group.name + "/" : ""}${logger.name}`)
                        .setDescription(content)
                        .setAuthor({name:type.name})
                        .setColor(Number("0x"+colorTable[type.name]))
                ]
            })
        }
    })

    // create ModeratedSubmissionSystems

    csle.log("Creating ModeratedSubmissionSystems...")
    
    let Things_SOP = new ModeratedSubmissionSystem<{name:string,image:string}>("Things",control,(emb,data) => emb.setDescription(data.name).setImage(data.image))
    let MemeSubmissionSystem = new ModeratedSubmissionSystem<string>("memes",control,
        (emb,url) => {        
            let nemb = url.split("/")[0] == "video" 
                ? emb.setDescription(`Sent a video: ${_config.monofile}/file/${url.split("/")[1]}`) 
                : emb.setImage(`${_config.monofile}/file/${url.split("/")[1]}`)

            return { 
                embed: nemb, 
                reply: url.split("/")[0] == "video" ? `${_config.monofile}/file/${url.split("/")[1]}` : "",
            }
        }, true
    )
    sts = new ModeratedSubmissionSystem<{name:string,activity:string}>("Statuses",control,(emb,data) => emb.setDescription(`${data.activity == "Listening" ? "Listening to" : data.activity} ${data.name}`))

    commands.share.set("Things",Things_SOP)
    commands.share.set("Statuses",sts)
    commands.share.set("memeSubmissionSystem",MemeSubmissionSystem)

    csle.log(`Starting API...`)
    startApi(client,control,commands,_config)

    csle.log("Starting ChannelManagers...")
    let cmc = new ChannelManagerController(control,commands)

    commands.share.set("ChannelManagerController",cmc)

    // collect commands
    
    csle.log(`Collecting commands...`)

    fs.readdir(process.cwd()+"/out/commands").then((fn) => {
        fn.forEach((name) => {
            let command = require(process.cwd()+"/out/commands/"+name)

            if (isSlashCommand(command)) {
                commands.add(command)
            }
        })

        csle.log(`Registering commands...`)
        commands.register().then((apiReply) => {
            if (Array.isArray(apiReply)) {
                csle.success(`${apiReply.length} commands registered.`)
            }
            commands.register_control_center().then((apiR) => {
                if (Array.isArray(apiR)) {
                    csle.success(`${apiR.length} control center command(s) registered.`)
                }

                csle.log("Reading status prompts...")
                fs.readFile(`${process.cwd()}/assets/unfunny/status.json`).then((buf) => {
                    statuses = JSON.parse(buf.toString())/*.map((e:{activity:string,name:string}) => {
                        return {
                            name:e.name,
                            type:activityTypeMap[e.activity]
                        }
                    })*/

                    csle.success("Read & parsed status file successfully.")

                    setInterval(switchStatus,5*60*1000)

                }).catch((err) => {
                    csle.error("Failed to read/parse status file.")
                    console.error(err)
                }).finally(switchStatus)
            })
        }).catch((e) => {csle.error("Failed to register commands.");console.error(e);process.exit()})
    
    }).catch((err) => {
        csle.error("Failed to read commands directory.")
        console.error(err)
        process.exit()
    })

})


client.on("guildCreate",(guild) => {

    /*
        join message
    */

    if (  
        guild.systemChannel &&
        !guild.systemChannelFlags.has(
            Discord.GuildSystemChannelFlags.SuppressJoinNotifications
        ) &&
        guild.members.me?.permissionsIn(guild.systemChannel).has(
            Discord.PermissionFlagsBits.SendMessages
        )
    ) {
        /* 
            If system channel
                & supress join notifications are off
                & bot has permissions to speak in system channel

            allow the bot to introduce itself!
        */

        guild.systemChannel.send({
            embeds: [
                new Discord.EmbedBuilder()
                    .setTitle("Hi there.")
                    .setDescription(
                        "Hi there, I'm theUnfunny. I'm a bot." +
                        "\nI'd personally recommend allowing my commands to be run outside of your commands" +
                        "\n channel - it's just more fun if you do that - although it's your server, do what you want." +
                        "\n\n[contributors](https://github.com/nbitzz/theUnfunny/graphs/contributors)" + 
                        " — [dependencies](https://github.com/nbitzz/theUnfunny/network/dependencies)" +
                        " — [source](https://github.com/nbitzz/theUnfunny)"
                    )
                    .setColor("Blurple")
                    .setImage("attachment://icon.png")
            ],
            files: [
                {
                    attachment: process.cwd()+'/assets/unfunny/brand/banner.png',
                    name: 'icon.png'
                }
            ]
        })
    }
})

// handle slash commands

client.on("interactionCreate",async (int) => {
    if (int.isChatInputCommand()) {
        commands.call(int)
              // todo: replace with isStringSelectMenu
              // when my vscode lets me lmao
    } else if (int.isStringSelectMenu()) {
        switch(int.customId) {
            case "controlSelMenu":
                if (operatorMenuOptions[int.values[0]] && int.user.id == control.owner?.id) {
                    operatorMenuOptions[int.values[0]](int,control).then(() => {
                        // there's probably a better way to do this
                        // but I haven't found it
                        int.message.edit({
                            components: [
                                new ActionRowBuilder<StringSelectMenuBuilder>()
                                    .addComponents(
                                        new StringSelectMenuBuilder()
                                            .addOptions(
                                                ...operatorMenuDisplay
                                            )
                                            .setCustomId("controlSelMenu")
                                    )
                            ]
                        })
                    })
                }
            break
        }
    } else if (int.isButton()) {

        if (int.customId=="___") {int.deferUpdate();return} // dummy button

        // actually, like, kill me please

        if (int.customId.startsWith("sub:") && int.channel && int.guildId == control.guild?.id) {
            let spl = int.customId.split(":")
            let chn = Systems.get(int.channel.id)
            if (chn) {
                await int.deferUpdate()

                switch(spl[1]) {
                    case "approve":
                        chn.acceptSubmission(spl[2])
                    break
                    case "delete":
                        chn.deleteSubmission(spl[2])
                    break
                    case "addAltText":
                        // prompt user for alt text using modal

                        let modal = new Discord.ModalBuilder()

                        modal
                            .setTitle("Set alt text")
                            .setCustomId("sub:altText:"+spl[2])
                            .addComponents(
                                new ActionRowBuilder<TextInputBuilder>()
                                    .addComponents(
                                        new TextInputBuilder()
                                            .setRequired(true)
                                            .setStyle(Discord.TextInputStyle.Paragraph)
                                            .setPlaceholder("Transcribe text and audio & describe viewable contents in extreme detail")
                                            .setCustomId("text")
                                            .setMaxLength(1024)
                                            .setLabel("Alt text")
                                            .setValue(chn.getSubmissions().find(e => e.id == spl[2])?.altText || "")
                                )
                            )
                        
                        int.showModal(modal)
                }
            }
        }
    } else if ( int.isModalSubmit() ) {

        if (int.customId.startsWith("sub:altText:") && int.channel) {
            let spl = int.customId.split(":")
            let chn = Systems.get(int.channel.id)
            if (chn) {
                await int.deferUpdate()

                chn.setAltText(spl[2],int.fields.getTextInputValue("text"))
            }
        }

    }
})

// error handling? i guess??

client.on("error",(err) => {
    csle.error("An error occured [djs].")
    csle.error(err.toString())
})

process.on("uncaughtException",(err) => {
    csle.error("An error occured [global].")
    csle.error(err.toString())
})

// login

fs.readFile(process.cwd()+"/config.json").then((buf) => {
    _config = JSON.parse(buf.toString())
    csle.info("Logging in...")
    client.login(_config.token)
}).catch((err) => {
    csle.error("Failed to read config.json.")
    console.error(err)
    process.exit(1)
})