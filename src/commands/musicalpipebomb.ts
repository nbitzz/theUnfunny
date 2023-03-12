/*
    This command is extremely buggy
    and my code for it kinda sucks ass
    lmao, I'd recommend that you delete
    it if you're selfhosting
*/

import axios from "axios";
import { Channel, ChannelType, DMChannel, EmbedBuilder, GuildMember, NonThreadGuildBasedChannel, SlashCommandBuilder, SlashCommandChannelOption, SlashCommandSubcommandBuilder, SlashCommandUserOption, VoiceChannel, VoiceState } from "discord.js";
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { SlashCommand } from "../lib/SlashCommandManager";
import { Readable } from "stream"

// get list of sfx

interface Pipebomb {
    url:string,
    beginVolume:number,
    volumeTimestamps:{
        [key:string]:number
    }
}

let pipebombs:Pipebomb[] = require(`${process.cwd()}/assets/commands/musicalpipebomb/PipebombSelection.json`)
let channelNames:string[] = require(`${process.cwd()}/assets/commands/musicalpipebomb/Messages.json`)

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("musicalpipebomb")
        .setDescription("This can't be good for your ears.")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("residential")
                .setDescription("This can't be good for your ears. MANAGE_CHANNELS & MOVE_MEMBERS are required.")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setName("name")
                        .setDescription("Input the package's recipient's name.")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("business")
                .setDescription("This can't be good for your ears.")
                .addChannelOption(
                    new SlashCommandChannelOption()
                        .setName("address")
                        .setDescription("Input the address that you would like to ship to.")
                        .setRequired(true)
                        .addChannelTypes(
                            ChannelType.GuildVoice
                        )
                )
        )
)

command.action = async (interaction) => {
    // check if in vc
    if (!interaction.guild) return
    
    if (
        interaction.guild.members.me?.voice.channel
        || (interaction.options.getSubcommand() == "residential" && (!interaction.guild.members.me?.permissions.has("MoveMembers") || !interaction.guild.members.me.permissions.has("ManageChannels")))
    ) {
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Please go get your vision checked")
                    .setDescription(`I'm already in a voice channel.`)
            ]
        })
        return
    }
    
    let pipebomb = pipebombs[Math.floor(Math.random()*pipebombs.length)]

    // get audio

    axios.get(pipebomb.url,{
        responseType:"arraybuffer"
    }).then(async (dt) => {
            // kill yourself

            if (!interaction.guild) return

            let target:null|GuildMember = null

            if (interaction.options.getSubcommand() == "residential") {
                target = await interaction.guild.members.fetch(
                    interaction.options.getUser("name",true).id
                ).catch(() => null)
            }

            if (interaction.options.getSubcommand() == "residential" && target && !target.voice.channel) {
                interaction.editReply({
                    embeds:[
                        {color:0xffffff,description:"Member is not in voice channel"}
                    ]
                })
                return
            }

            // i hate this library
            // should have started with eris

            let ttargetVC = interaction.options.getSubcommand() == "business" ?
                interaction.options.getChannel("address",true)
                : await interaction.guild.channels.create<ChannelType.GuildVoice>({
                    name:channelNames[Math.floor(Math.random()*channelNames.length)],
                    type:ChannelType.GuildVoice,
                })

            // fuck you discord.js
            let targetVC = await interaction.guild.channels.fetch(ttargetVC.id)

            if (targetVC && targetVC.type == ChannelType.GuildVoice) {
                
                if (interaction.options.getSubcommand() == "residential" && !target) return

                let intvl:NodeJS.Timeout|null
                let TOs:NodeJS.Timeout[] = []
                
                let player = createAudioPlayer()

                let conn = joinVoiceChannel({
                    channelId: targetVC.id,
                    guildId: targetVC.guild.id,
                    adapterCreator: targetVC.guild.voiceAdapterCreator
                })
                let cleanup = () => {
                    if (conn && conn.state.status != VoiceConnectionStatus.Destroyed) conn.destroy()
                    if (intvl) clearInterval(intvl)
                    TOs.forEach(e => clearTimeout(e))
                    
                    interaction.client.removeListener("voiceStateUpdate",voiceChannelDeleteCheck)
                    interaction.client.removeListener("voiceStateUpdate",memberLeaveVoiceCheck)
                }
                let voiceChannelDeleteCheck = (channel:NonThreadGuildBasedChannel|DMChannel) => {
                    if (targetVC && channel.id == targetVC.id) cleanup()
                }
                let memberLeaveVoiceCheck = (oldState:VoiceState,newState:VoiceState) => {
                    if (targetVC && newState.member == target && (newState.channel || {}).id != targetVC.id) cleanup()
                }
                
                interaction.client.on("voiceStateUpdate",memberLeaveVoiceCheck)
                interaction.client.on("channelDelete",voiceChannelDeleteCheck)

                let intervals:[number,number][] = []
                

                
                if (target && target.voice.channel && targetVC?.type == ChannelType.GuildVoice) await target.voice.setChannel(targetVC)

                conn.on(VoiceConnectionStatus.Ready, () => {
                    let resource = createAudioResource(Readable.from(dt.data), {inlineVolume:true})
                    resource.volume?.setVolume(pipebomb.beginVolume)

                    for (let [key,value] of Object.entries(pipebomb.volumeTimestamps)) {
                        // bad way of doing this but all of this code is bad so who really cares
                        let m = parseInt(key.split(":")[0],10)
                        let s = parseInt(key.split(":")[1].split(".")[0],10)
                        let ms = parseInt(key.split(":")[1].split(".")[1],10)

                        
                        /*
                        intervals.push([(m*1000*60)+(s*1000)+ms,value])
                        */
                        // 320ms early casue fm,pe
                        // just a rough estimation but whatever
                        // ive spent too much time on this to care
                        TOs.push(setTimeout(() => {
                            resource.volume?.setVolume(value)
                        },((m*1000*60)+(s*1000)+ms)-320))
                    }
                    player.once(AudioPlayerStatus.Playing,() => {
                        interaction.editReply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor("Green")
                                    .setDescription(`Pipe bomb sent`)
                            ]
                        })
                        
                        player.on(AudioPlayerStatus.Idle,() => {
                            if (conn && conn.state.status != VoiceConnectionStatus.Destroyed) {
                                conn.destroy()
                            }
                        })
                    })
                    
                    conn.subscribe(player)
                    player.play(resource)
                })
                conn.on(VoiceConnectionStatus.Disconnected,() => {
                    conn.destroy()
                })
                conn.on(VoiceConnectionStatus.Destroyed, () => {
                    if (player) {
                        player.stop()
                    }

                    if (interaction.options.getSubcommand() == "residential") {
                        targetVC?.delete()
                    }
                })
                conn.on("error",(err) => {
                    console.error(err)
                })
                player.on("error",(err) => {
                    console.error(err)
                    if (conn && conn.state.status != VoiceConnectionStatus.Destroyed) {
                        conn.destroy()
                    }
                })
            } else {
                interaction.editReply("fuk yoy")
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

command.ephmeralReply = true

module.exports = command