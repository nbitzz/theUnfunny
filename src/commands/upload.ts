import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandAttachmentOption, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { ModeratedSubmissionSystem, type Submission } from "../lib/ModeratedSubmissionFramework";
import axios from "axios";

// init slash commands

let _config = require("../../config.json")

let submissions:ModeratedSubmissionSystem<string>

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("upload")
        .setDescription(`Upload files to the monofile instance used by this bot, ${_config.monofile.split("//")[1]}`)
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("file")
                .setDescription("Uploads files to monofile")
                .addAttachmentOption(
                    new SlashCommandAttachmentOption()
                        .setName("file")
                        .setDescription("File to upload")
                        .setRequired(true)
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("custom-id")
                        .setDescription("Custom ID for your new file")
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("url")
                .setDescription("Clone a file using its URL to monofile")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("url")
                        .setDescription("URL of the file you would like to clone")
                        .setRequired(true)
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("custom-id")
                        .setDescription("Custom ID for your new file")
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("video")
                .setDescription("Clone a file using projectlounge's ytdlp API to monofile")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("url")
                        .setDescription("URL of the YouTube video you would like to clone")
                        .setRequired(true)
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("custom-id")
                        .setDescription("Custom ID for your new file")
                )
        )
)

async function submitURL(interaction:ChatInputCommandInteraction,url:string) {
    await interaction.editReply("Requesting file clone...")                 

    axios.post(`${_config.monofile}/clone`,JSON.stringify({url:url,uploadId:interaction.options.getString("custom-id")}),{headers:{"Content-Type":"text/plain"}}).then(async (data) => {
        await interaction.editReply(`Your file is now available at [this URL](${_config.monofile}/file/${data.data}):\n\`\`\`${_config.monofile}/file/${data.data}\`\`\``)
    }).catch(async (err) => {
        console.error(err)

        interaction.editReply({
            content:"",
            embeds: [
                new EmbedBuilder()
                    .setDescription(`File cloning failed.\n\`\`\`${err ? err?.data || err.toString() : "err"}\`\`\``)
                    .setColor("Red")
            ]
        })
    })
}

command.action = async (interaction, control, share) => {
    if (!submissions) submissions = share.get("memeSubmissionSystem")
    
    await submissions.ready()

    switch(interaction.options.getSubcommand()) {
        
        case "file":
            submitURL(interaction,interaction.options.getAttachment("file",true).url)
        break
        case "url":
            submitURL(interaction,interaction.options.getString("url",true))
        break
        case "video":
            submitURL(interaction,`https://projectlounge.pw/ytdl/download?url=${encodeURIComponent(interaction.options.getString("url",true))}`)
        break

    }
}

// check for monofile before enabling the funny command
if (_config.monofile) module.exports = command