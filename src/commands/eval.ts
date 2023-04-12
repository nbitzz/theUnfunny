import { ActionRowBuilder, ButtonBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandUserOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { Logger } from "../lib/logger"

let csle = new Logger("eval","commands")

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("eval")
        .setDescription("JS eval()")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("script")
                .setDescription("Script to run")
                .setRequired(true)
        )
)

command.controlCenterOnly = true

command.action = async (interaction,control,share) => {
    let owner = control.owner

    if (!owner) return

    if (interaction.user.id != owner.id) {
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription("You must be the owner of this instance to use /eval.")
                    .setColor("Red")
            ]
        })
    }
    
    try {
        interaction.editReply({
            embeds:[
                new EmbedBuilder()
                    .setTitle("Result")
                    .setDescription(`\`\`\`${eval(interaction.options.getString("script",true))}\`\`\``)
            ]
        })
    } catch(err:any) {
        csle.error(err.toString() || "no content")
    }
}

module.exports = command