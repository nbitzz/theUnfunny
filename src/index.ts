// i get that you shouldn't be doing thiss
// but i'm tired so like ehh

import { Logger, Groups, use } from "./lib/logger"
new Groups.LoggerGroup("Library","0,255,150")

import fs from "fs/promises"
import Discord, { APIApplicationCommand, Client, EmbedBuilder, IntentsBitField } from "discord.js"
import { SlashCommandManager, isSlashCommand } from "./lib/SlashCommandManager"
import { CommandAndControl } from "./lib/CommandAndControl"

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
    token:string
}

let control:CommandAndControl
let commands = new SlashCommandManager(client)

let activityTypeMap:{[key:string]:Discord.ActivityType} = {
    Playing: Discord.ActivityType.Playing,
    Watching: Discord.ActivityType.Watching,
    Listening: Discord.ActivityType.Listening
}

let statuses:Discord.ActivitiesOptions[] = [
    {
        type:Discord.ActivityType.Watching,
        name:"you"
    }
]

let switchStatus = () => {
    client.user?.setPresence({
        activities:[
            statuses[Math.floor(Math.random()*statuses.length)]
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
            status:Discord.PresenceUpdateStatus.DoNotDisturb
        })
        
        csle.error(`Your Command & Control center has not been set up.`)
        csle.info ("Please wait for setup to begin.")
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
    
    let bot_logs_channel = await control.getChannel("bot-logs")

    use({
        log: (logger,type,content) => {
            bot_logs_channel.send({
                embeds:[
                    new EmbedBuilder()
                        .setTitle(`${logger.group ? logger.group.name + "/" : ""}${logger.name}`)
                        .setDescription(content)
                        .setAuthor({name:type.name})
                ]
            })
        }
    })
    
    csle.log(`Collecting commands....`)

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

            csle.log("Reading status prompts...")
            fs.readFile(`${process.cwd()}/assets/unfunny/status.json`).then((buf) => {
                statuses = JSON.parse(buf.toString()).map((e:{activity:string,name:string}) => {
                    return {
                        name:e.name,
                        type:activityTypeMap[e.activity]
                    }
                })

                csle.success("Read & parsed status file successfully.")

                setInterval(switchStatus,5*60*1000)

            }).catch((err) => {
                csle.error("Failed to read/parse status file.")
                console.error(err)
            }).finally(switchStatus)
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
                        "Since you allow join messages in the system channel," +
                        " I'll assume that I can introduce myself.\n\n" +
                        "Hi, I'm unfunny. I'm going to make your server hell," +
                        " if you don't mind. I'm not going to make your moderation" +
                        " workflow complex with extra unnecessary administration commands, however." +
                        " I don't have those commands.\n\n" +
                        "So anyway, I hope you ~~don't~~ enjoy your time with me. " +
                        "And, if I break, go ahead and [fix it yourself.](https://github.com/nbitzz/theUnfunny) " +
                        "I'm a Discord bot, what do you expect me to do?" +
                        "\n\n[contributors](https://github.com/nbitzz/theUnfunny/graphs/contributors)" + 
                        " — [dependency hell](https://github.com/nbitzz/theUnfunny/network/dependencies)"
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

client.on("interactionCreate",(int) => {
    if (int.isChatInputCommand()) {
        commands.call(int)
    }
})

// error handling? i guess??

client.on("error",(err) => {
    csle.error("An error occured.")
    console.error(err)
})

// login

fs.readFile(process.cwd()+"/config.json").then((buf) => {
    _config = JSON.parse(buf.toString())
    client.login(_config.token)
}).catch((err) => {
    csle.error("Failed to read config.json.")
    console.error(err)
    process.exit(1)
})