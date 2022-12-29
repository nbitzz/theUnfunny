import { ActivityType, SlashCommandAttachmentOption, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { ModeratedSubmissionSystem } from "../lib/ModeratedSubmissionFramework";
import { SlashCommand } from "../lib/SlashCommandManager";

// init slash command

let statuses:ModeratedSubmissionSystem<{name:string,activity:string}>

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("bot")
        .setDescription("This can only go well!")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("submit-status")
                .setDescription("Submit a status. This can only go well!")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("prefix")
                        .setDescription("What's your status going to start with?")
                        .setChoices(
                            {name:"Playing",value:"Playing"},
                            {name:"Listening to",value:"Listening"},
                            {name:"Watching",value:"Watching"}
                        )
                        .setRequired(true)
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("name")
                        .setDescription("What's actually in the status?")
                        .setMaxLength(80)
                        .setRequired(true)
                )
        )/*
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("submit-avatar")
                .setDescription("Submit an avatar. This can only go well!")
                .addAttachmentOption(
                    new SlashCommandAttachmentOption()
                        .setName("file")
                        .setDescription("File to submit. Avatars will be switched every 12hrs.")
                        .setRequired(true)
                )
        )*/
)

command.action = async (interaction,control,share) => {
    statuses = share.has("Statuses") ? share.get("Statuses") : statuses

    await statuses.ready()

    switch(interaction.options.getSubcommand()) {
        case "submit-status":
            await interaction.editReply("Submitting...")
            await statuses.submit(interaction.user,{activity:interaction.options.getString("prefix",true),name:interaction.options.getString("name",true)})
            await interaction.editReply("Status submitted.")
        break
    }
}

module.exports = command