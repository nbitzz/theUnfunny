import { ActionRowBuilder, ButtonBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandUserOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { Logger } from "../lib/logger"
import { Systems } from "../lib/ModeratedSubmissionFramework"; 

let csle = new Logger("nextup","commands")

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("upnext")
        .setDescription("What's next?")
)

command.controlCenterOnly = true

// bad code but ehhh

command.action = async (interaction,control,share) => {
    await control.ready()

    let nextMessages: string[] = []

    Systems.forEach(s => {
        if (s.data.submissions.find(e => !e.moderated)) {
            nextMessages.push(
                `${s.data.submissions.length-s.getSubmissions().length} pending in ${s.name}:`
                + ` https://discord.com/channels/${control.guild?.id}/${s.channel?.id}/${s.data.submissions.find(e => !e.moderated)?.id}`
            )
        }

        if (s.takeDescriptions && s.getSubmissions().find(e => !e.altText)) {
            nextMessages.push(
                `${s.getSubmissions().length-s.getSubmissions().filter(e => !e.altText).length} unsearchable in ${s.name}:`
                + ` https://discord.com/channels/${control.guild?.id}/${s.channel?.id}/${s.getSubmissions().find(e => !e.altText)}`
            )
        }
    })

    interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setTitle(`Hey ${interaction.user.username}, here's what's next`)
                .setDescription(nextMessages.join("\n") || "Nothing to show")
        ]
    })
}

module.exports = command