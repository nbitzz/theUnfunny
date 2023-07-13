import axios from "axios";
import { EmbedBuilder, SlashCommandBuilder, ActionRowBuilder, ComponentType, ButtonBuilder, ButtonStyle, SlashCommandSubcommandBuilder, SlashCommandStringOption } from "discord.js";
import { createAudioPlayer, createAudioResource, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { SlashCommand } from "../lib/SlashCommandManager";
import { Readable } from "stream"
import { ilibpolicy, setPolicy } from "../lib/ServerPolicy";

let _config = require("../../config.json") // todo: maybe change this
// also this is lazy as hell lol too bad

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("policy")
        .setDescription("Configure your server settings")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("sexualcontent")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("value")
                        .setDescription("Preferred sexual content level (affects /meme's output)")
                        .addChoices(
                            {
                                name: "Safe for work only",
                                value: "Safe for work only"
                            },
                            {
                                name: "Suggestive content",
                                value: "Suggestive content"
                            },
                            {
                                name: "Heavily suggestive content",
                                value: "Heavily suggestive content"
                            },
                        )
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("language")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("value")
                        .setDescription("Preferred language level (affects /meme's output)")
                        .addChoices(
                            {
                                name: "Clean content only",
                                value: "Clean content only"
                            },
                            {
                                name: "Allow insensitive content",
                                value: "Allow insensitive content"
                            },
                            {
                                name: "Allow slurs",
                                value: "Allow slurs"
                            },
                        )
                )
        )
)

command.ephmeralReply = true

command.action = async (interaction) => {
    
    if (!interaction.guild || !interaction.member || typeof interaction.member.permissions == "string" || !interaction.member.permissions.has("ManageGuild")) {
        interaction.editReply("This command can only be run in a server, and requires the Manage Server permission.")
        return
    }

    switch (interaction.options.getSubcommand()) {
        case "language": 
            //@ts-ignore i'm fucking tired
            setPolicy(interaction.guild.id, "permittedLanguage", interaction.options.getString("value", true))
        break
        case "sexualcontent": 
            //@ts-ignore ditto.... again
            setPolicy(interaction.guild.id, "permittedSexualContent", interaction.options.getString("value", true))
        break
    }
    
    interaction.editReply("Set policy.")

}

module.exports = command