import fs from "fs/promises"
import Discord, { Client, IntentsBitField } from "discord.js"
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
        }).catch((e) => {console.error(e);process.exit()})
    }).catch((err) => {
        console.error("[theUnfunny] readdir failed")
        console.error(err)
        process.exit()
    })

})

client.on("guildMemberAdd",(member) => {
    if (member.id == client.user?.id) {
        // Tried to make this look as neat as possible.
        // maybe switch to if (bool) return?
        if (  
            member.guild.systemChannel &&
            !member.guild.systemChannelFlags.has(
                Discord.SystemChannelFlagsBitField.Flags.SuppressJoinNotifications
            ) &&
            member.permissionsIn(member.guild.systemChannel).has(
                Discord.PermissionsBitField.Flags.SendMessages
            )
        ) {
            /* 
                If system channel
                   & supress join notifications are off
                   & bot has permissions to speak in system channel

                allow the bot to introduce itself!
            */

            member.guild.systemChannel.send({
                embeds: [
                    new Discord.EmbedBuilder()
                        .setTitle("Hi there.")
                        .setDescription(
                            "Since you allow join messages in the system channel," +
                            " I'll assume that I can introduce myself.\n\n" +
                            "Hi, I'm unfunny. I'm not bloated with" +
                            " unnecessary extra administration features. I'm" +
                            " just bloated with unnecessary features in general."
                        )
                        .setColor("Blurple")
                        .setImage("attachment://icon.png")
                ],
                files: [
                    {
                        attachment: process.cwd()+'/assets/unfunny/icon.png',
                        name: 'icon.png'
                    }
                ]
            })
        }
    }
})

// handle slash commands

client.on("interactionCreate",(int) => {
    if (int.isChatInputCommand()) {
        commands.call(int)
    }
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