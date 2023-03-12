import axios from "axios";
import { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ComponentType, ButtonBuilder, ButtonStyle } from "discord.js";
import { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { SlashCommand } from "../lib/SlashCommandManager";
import { Readable } from "stream"

let _config = require("../../config.json") // todo: maybe change this

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("boom")
        .setDescription("I'm sorry, what?")
)

command.ephmeralReply = true

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

    // get audio

    axios.get("https://cdn.discordapp.com/attachments/1044017023883157617/1044739105331884062/THESOUND.mp3",{
        responseType:"arraybuffer"
    }).then(async (dt) => {
        
        // connect to vc
        // (god i hate this new api this is so stupid)

        let targetVC = interaction.guild ? (await interaction.guild.members.fetch(interaction.user.id)).voice.channel : null

        if (targetVC && interaction.guild) {
            await interaction.editReply({
                embeds:[
                    new EmbedBuilder()
                        .setDescription("Connecting...")
                        .setColor("Blurple")
                ]
            })

            let gid = interaction.guild.id
            let player = createAudioPlayer()

            let conn = joinVoiceChannel({
                channelId: targetVC.id,
                guildId: targetVC.guild.id,
                adapterCreator: targetVC.guild.voiceAdapterCreator
            })
            conn.on(VoiceConnectionStatus.Ready, async () => {
                conn.subscribe(player)

                let rep = await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Green")
                            .setDescription(`Ready`)
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(
                                new ButtonBuilder()
                                    .setEmoji("😱")
                                    .setStyle(ButtonStyle.Success)
                                    .setCustomId("boom:1"),
                                new ButtonBuilder()
                                    .setEmoji("😱")
                                    .setLabel("×2")
                                    .setStyle(ButtonStyle.Primary)
                                    .setCustomId("boom:2"),
                                new ButtonBuilder()
                                    .setEmoji("😱")
                                    .setLabel("×3")
                                    .setStyle(ButtonStyle.Secondary)
                                    .setCustomId("boom:3"),
                                new ButtonBuilder()
                                    .setEmoji("😱")
                                    .setLabel("×10")
                                    .setStyle(ButtonStyle.Danger)
                                    .setCustomId("boom:10")
                            )
                    ]
                })

                let coll = rep.createMessageComponentCollector({
                    componentType:ComponentType.Button,
                    idle:180000
                })

                coll.on("collect", (int) => {
                    if (int.user.id != interaction.user.id) {
                        int.reply({
                            ephemeral:true,
                            embeds: [{description:"This prompt isn't yours!",color:0xFF0000}]
                        })
                        return
                    } else {
                        if (int.customId.split(":")[0] == "boom") {
                            int.update({})
                            // apparently inline volume is required for .setVolume
                            let resource = createAudioResource(Readable.from(dt.data), {inlineVolume:true})
                            resource.volume?.setVolume(parseInt(int.customId.split(":")[1],10))

                            player.play(resource)
                        }
                    }
                })

                coll.on("end",() => {
                    interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription("Prompt expired")
                                .setColor("Red")
                        ],
                        components:[]
                    })
                })
            })
            conn.on(VoiceConnectionStatus.Destroyed, () => {
                if (player) {
                    player.stop()
                }
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setDescription(`Connection was destroyed. Run /boom to reconnect.`)
                    ],
                    components:[]
                })
            })
            conn.on(VoiceConnectionStatus.Disconnected,() => {
                conn.destroy()
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