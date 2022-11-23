import { getVoiceConnection } from "@discordjs/voice";
import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";

// you can change these if you're selfhosting i guess

let MAX_PAGES = 10

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("what")
        .setDescription("Huh?")
)

command.action = async (interaction) => {
    if (!interaction.guild) return

    let connection = getVoiceConnection(interaction.guild.id)
    let myVoice = interaction.guild.members.me?.voice.channel

    let memb = await interaction.guild.members.fetch(interaction.user.id)

    if (connection && memb && memb.voice.channel == myVoice && myVoice != null) {
        connection.destroy()
        interaction.editReply("Done!")
    } else {
        interaction.editReply("Are you in a voice channel? Am I in a voice channel? Are we in the same voice channel? I'm not sure, really, I'm too lazy to write a description for what happens when any of the checks fail")
    }
}

module.exports = command