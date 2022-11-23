import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("what")
        .setDescription("Huh?")
)

command.action = async (interaction) => {
    if (!interaction.guild) return

    interaction.editReply("oops this isn't finished")
}

module.exports = command