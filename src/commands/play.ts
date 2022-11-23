import axios from "axios";
import { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption, SlashCommandAttachmentOption, SlashCommandSubcommandBuilder, APIApplicationCommandAutocompleteGuildInteraction, APIApplicationCommandOptionChoice, SlashCommandNumberOption, ActionRowBuilder, SelectMenuBuilder, ComponentType } from "discord.js";
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { SlashCommand } from "../lib/SlashCommandManager";
import { Readable } from "stream"
import getLinks from "../lib/links";
import { getAudioUrl } from "google-tts-api"

// get list of sfx

let builtinSFX:{[key:string]:string} = require(`${process.cwd()}/assets/commands/play/Soundlist.json`)
let sfxMap:APIApplicationCommandOptionChoice<string>[] = []
let _config = require("../../config.json") // todo: maybe change this

for (let [key,value] of Object.entries(builtinSFX)) {
    sfxMap.push({name:key,value:key})
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
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("tts")
                .setDescription("Use GoogleTTS to say something")
                    .addStringOption(
                        new SlashCommandStringOption()
                            .setName("text")
                            .setDescription("Text to speak (max 200char)")
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
    else if (interaction.options.getSubcommand() == "sfx") file_url = builtinSFX[interaction.options.getString("name",true)]
    else if (interaction.options.getSubcommand() == "tts") {
        let tx = interaction.options.getString("text",true)
        if (tx.length > 200) {
            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("String must be under 200 characters")
                ]
            })
            return
        }
        file_url = getAudioUrl(tx)
    }
    else return

    let links = getLinks(file_url)
    if (!links[0]) {
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(`No links found`)
            ]
        })

        return
    }

    // invidious "support"
    // todo(n't): document this feature 😱😱😱😱
    // todo: use yt-dlp-wrap here
    //       (this is stupid why am i doing this)

    let vid:string|void = undefined

    if (links[0].domain == "www.youtube.com" || links[0].domain == "youtube.com" || links[0].domain == "m.youtube.com") {
        let vid_b = links[0].params.find(e => e.key == "v")
        if (vid_b) vid = vid_b.value
    } else if (links[0].domain == "youtu.be") {
        if (links[0].path) vid = links[0].path
    }

    if (vid && _config.invidious) {
        let apiResponse = await axios.get(`${_config.invidious}/api/v1/videos/${vid}`)

        let audioTracks = apiResponse.data.adaptiveFormats.filter((e:{[key:string]:any}) => e.type.startsWith("audio/"))

        if (audioTracks.length == 0) {
            interaction.editReply({embeds:[{description:"No audio tracks",color:0xff0000}]})
            return
        }

        let repl = await interaction.editReply({
            embeds:[
                new EmbedBuilder()
                    .setColor("Blurple")
                    .setTitle("Select an audio track")
            ],
            components:[
                new ActionRowBuilder<SelectMenuBuilder>()
                    .setComponents(
                        new SelectMenuBuilder()
                            .setOptions(
                                ...audioTracks.map((track:{[key:string]:any},index:number) => {
                                    return {
                                        label: `${track.audioSampleRate}hz ${Math.floor(track.bitrate/1000)}k`,
                                        description:`${track.audioQuality} | ${(track.encoding || "Unknown").toUpperCase()} | ${track.audioChannels == 1 ? "mono" : "stereo"}`,
                                        value:index.toString()
                                    }
                                })
                            )
                            .setCustomId("audioTrack")
                            .setPlaceholder("Select track..."),
                    )
            ]
        })

        file_url = ""

        await new Promise<void>((resolve,reject) => {
            let coll = repl.createMessageComponentCollector({
                componentType:ComponentType.StringSelect,
                time:40000
            })

            coll.on("collect",async (int) => {
                if (int.user.id != interaction.user.id) {
                    int.reply({
                        ephemeral:true,
                        embeds: [{description:"This prompt isn't yours!",color:0xFF0000}]
                    })
                    return
                } else {
                    file_url = audioTracks[parseInt(int.values[0],10)].url
                    coll.stop()
                }
            })

            coll.on("end", () => {
                resolve()
            })
        })

        if (!file_url) {
            interaction.editReply({
                embeds: [
                    {description:"No audio track selected",color:0xff0000}
                ],
                components:[]
            })
            return
        } else {
            await interaction.editReply({
                embeds: [
                    {description:"hi googlevideo.com is throttled so like\nif you want to include PROPER youtube support please\nmake a [pull request](https://github.com/nbitzz/theUnfunny/pull)\nthanks\n\nbtw the audio will still play itll just take a while",color:0x0000ff}
                ],
                components:[]
            })
        }
    } else if (vid) {
        interaction.editReply({
            embeds: [
                {description:"i asked for an audio FILE not a youtube link",color:0xff0000}
            ]
        })
        return
    }

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

                let player = createAudioPlayer()

                let conn = joinVoiceChannel({
                    channelId: targetVC.id,
                    guildId: targetVC.guild.id,
                    adapterCreator: targetVC.guild.voiceAdapterCreator
                })
                conn.on(VoiceConnectionStatus.Ready, () => {
                    player.once(AudioPlayerStatus.Playing,() => {
                        interaction.editReply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor("Green")
                                    .setDescription(`Playing sound effect`)
                            ]
                        })

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