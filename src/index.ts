import fs from "fs/promises"
import Discord, { APIApplicationCommand, Client, IntentsBitField } from "discord.js"
import { SlashCommandManager, isSlashCommand } from "./lib/SlashCommandManager"

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

let commands = new SlashCommandManager(client)

let updatePresence = async function() {
    client.user?.setPresence({
        activities:[
            {
                type:Discord.ActivityType.Watching,
                name:`you & ${Array.from((await client.guilds.fetch()).values()).length} servers`
            }
        ]
    })
}

client.on("messageCreate",() => {
    
})

client.on("ready",() => {
    if (!client.user) return 
    
    console.log(`[theUnfunny] Hi, I'm ${client.user.tag}.`)
    console.log(`[theUnfunny] Collecting commands...`)

    fs.readdir(process.cwd()+"/out/commands").then((fn) => {
        fn.forEach((name) => {
            let command = require(process.cwd()+"/out/commands/"+name)

            if (isSlashCommand(command)) {
                commands.add(command)
            }
        })

        console.log(`[theUnfunny] Registering commands...`)
        commands.register().then((apiReply) => {
            if (Array.isArray(apiReply)) {
                console.log(`[theUnfunny] ${apiReply.length} commands registered.`)
            }

            updatePresence()
        }).catch((e) => {console.error(e);process.exit()})
    }).catch((err) => {
        console.error("[theUnfunny] readdir failed")
        console.error(err)
        process.exit()
    })

})

client.on("guildDelete",() => {
    updatePresence()
})

client.on("guildCreate",(guild) => {

    /*
        pres. update
    */

    updatePresence()

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
                        "I'm a Discord bot, what do you expect me to do?"
                    )
                    .setColor("Blurple")
                    .setImage("attachment://icon.png")
            ],
            files: [
                {
                    attachment: process.cwd()+'/assets/unfunny/banner.png',
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
    console.error(err)
})

// login

fs.readFile(process.cwd()+"/config.json").then((buf) => {
    _config = JSON.parse(buf.toString())
    client.login(_config.token)
}).catch((err) => {
    console.error("[theUnfunny] Failed to read config.json.")
    console.error(err)
    process.exit(1)
})