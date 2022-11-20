import fs from "fs/promises"
import Discord, { Client, IntentsBitField } from "discord.js"

let client = new Client({
    intents: [
        /* todo: probably justify some of these intents */
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.DirectMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.MessageContent
    ]
})

let _config:{
    token:string
}

client.on("messageCreate",() => {
    
})

client.on("ready",() => {
    if (!client.user) return 
    
    console.log(`[theUnfunny] Hi, I'm ${client.user.tag}.`)
})

// login

fs.readFile("../config.json").then((buf) => {
    _config = JSON.parse(buf.toString())
    client.login(_config.token)
}).catch((err) => {
    console.error("[theUnfunny] Failed to read config.json.")
    console.error(err)
    process.exit(1)
})