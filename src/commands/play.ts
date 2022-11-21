import axios from "axios";
import { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption, SlashCommandAttachmentOption, SlashCommandSubcommandBuilder, APIApplicationCommandAutocompleteGuildInteraction, APIApplicationCommandOptionChoice, SlashCommandNumberOption } from "discord.js";
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { SlashCommand } from "../lib/SlashCommandManager";
import { Readable } from "stream"

// get list of sfx

let builtinSFX:{[key:string]:string} = require(`${process.cwd()}/assets/commands/play/Soundlist.json`)
let sfxMap:APIApplicationCommandOptionChoice<string>[] = []

for (let [key,value] of Object.entries(builtinSFX)) {
    sfxMap.push({name:key,value:value})
}

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a sound file")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("sfx")
                .setDescription("Play a built in sound file")
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setName("name")
                            .setDescription("Name of a builtin sound")
                            .setChoices(...sfxMap)
                            .setRequired(true)
                    )
                    .addNumberOption(
                        new SlashCommandNumberOption()
                            .setName("volume")
                            .setDescription("Audio volume")
                            .setMinValue(0)
                            .setRequired(false)
                    )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("url")
                .setDescription("Play a sound file using a URL")
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setName("url")
                            .setDescription("URL of a sound file")
                            .setRequired(true)
                    )
                    .addNumberOption(
                        new SlashCommandNumberOption()
                            .setName("volume")
                            .setDescription("Audio volume")
                            .setMinValue(0)
                            .setRequired(false)
                    )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("file")
                .setDescription("Play a sound file using a direct file upload")
                    .addAttachmentOption(
                        new SlashCommandAttachmentOption()
                            .setName("file")
                            .setDescription("Sound file")
                            .setRequired(true)
                    )
                    .addNumberOption(
                        new SlashCommandNumberOption()
                            .setName("volume")
                            .setDescription("Audio volume")
                            .setMinValue(0)
                            .setRequired(false)
                    )
        )
)

command.action = async (interaction) => {
    // check if in vc
    if (!interaction.guild) return
    
    if (
        interaction.guild.members.me?.voice.channel
        || !(await interaction.guild.members.fetch(interaction.user.id)).voice.channel
    ) {
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Please go get your vision checked")
                    .setDescription(`You're either not in a voice channel or I'm in another voice channel right now. Look at the damn channel list.`)
            ]
        })
        return
    }
    
    // figure out file url
    let file_url:string = ""

    // would be a good idea to make this a switch statement instead.

    if (interaction.options.getSubcommand() == "file") file_url = interaction.options.getAttachment("file",true).proxyURL
    else if (interaction.options.getSubcommand() == "url") file_url = interaction.options.getString("url",true)
    else if (interaction.options.getSubcommand() == "sfx") file_url = interaction.options.getString("sfx",true)
    else return

    // get audio
    axios.get(file_url,{
        responseType:"arraybuffer"
    }).then(async (dt) => {
        // make sure audio is audio/ or video/
        if (
            dt.headers["content-type"]
            && (dt.headers["content-type"].startsWith("audio/")
            || dt.headers["content-type"].startsWith("video/"))
        ) {
            // connect to vc
            // (god i hate this new api this is so stupid)

            let targetVC = interaction.guild ? (await interaction.guild.members.fetch(interaction.user.id)).voice.channel : null

            if (targetVC) {
                // apparently inline volume is required for .setVolume
                let resource = createAudioResource(Readable.from(dt.data), {inlineVolume:true})
                resource.volume?.setVolume((interaction.options.getNumber("volume",false) || 100)/100)

                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setDescription(`Attempting to play.`)
                    ]
                })

                let player = createAudioPlayer()

                let conn = joinVoiceChannel({
                    channelId: targetVC.id,
                    guildId: targetVC.guild.id,
                    adapterCreator: targetVC.guild.voiceAdapterCreator
                })
                conn.on(VoiceConnectionStatus.Ready, () => {
                    player.once(AudioPlayerStatus.Playing,() => {
                        console.log("playing")
                        conn.subscribe(player)
                        player.on(AudioPlayerStatus.Idle,() => {
                            if (conn) {
                                conn.destroy()
                            }
                        })
                    })

                    player.play(resource)
                })
                conn.on(VoiceConnectionStatus.Destroyed, () => {
                    if (player) {
                        player.stop()
                    }
                })
                conn.on("error",(err) => {
                    console.error(err)
                })
                player.on("error",(err) => {
                    console.error(err)
                    if (conn) {
                        conn.destroy()
                    }
                })
            }
        } else {
            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle("Error")
                        .setDescription(`Invalid audio file.`)
                ]
            })
        }
    }).catch((err) => {
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Error")
                    .setDescription(`Failed to get audio file.`)
            ]
        })
        console.error(err)
    })
}

module.exports = command