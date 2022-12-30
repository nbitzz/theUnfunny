// genuinely sorry for whoever reads this code

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandAttachmentOption, SlashCommandBuilder, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { ModeratedSubmissionSystem } from "../lib/ModeratedSubmissionFramework";
import axios from "axios";

// init slash commands

let _config = require("../../config.json")

let submissions:ModeratedSubmissionSystem<{name:string,image:string}>

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("things")
        .setDescription("The crowd-sourced Smash or Pass list")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("info")
                .setDescription("More information about this command")
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("submit-file")
                .setDescription("Submit something for the Things smash or pass list")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("name")
                        .setDescription("What's this called?")
                        .setMaxLength(100)
                        .setRequired(true)
                )
                .addAttachmentOption(
                    new SlashCommandAttachmentOption()
                        .setName("file")
                        .setDescription("An image")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("submit-url")
                .setDescription("Submit something for the Things smash or pass list")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("name")
                        .setDescription("What's this called?")
                        .setMaxLength(100)
                        .setRequired(true)
                )
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("url")
                        .setDescription("A link to an image")
                        .setRequired(true)
                )
        )
)

async function submitThing(interaction:ChatInputCommandInteraction,name:string,url:string) {
    await interaction.editReply("Requesting file clone...")
    axios.post(`${_config.monofile}/clone`,JSON.stringify({url:url}),{headers:{"Content-Type":"text/plain"}}).then(async (data) => {
        await interaction.editReply("Reviewing file...")

        let d = await axios.get(`${_config.monofile}/file/${data.data}`,{responseType:"arraybuffer"})

        if (
            !(d.headers["content-type"] 
            && d.headers["content-type"].startsWith("image/"))
            ) await interaction.editReply("Invalid file type.")

        if (d.data.byteLength >= 30*1024*1024) await interaction.editReply("File too large.")

        await submissions.submit(interaction.user,{image:`${_config.monofile}/file/${data.data}`,name:name})
    
        interaction.editReply({
            content:"",
            embeds: [
                new EmbedBuilder()
                    .setDescription("Your item has been submitted.")
                    .setColor("Blurple")
            ]
        })
    }).catch(async (err) => {
        console.error(err)

        interaction.editReply({
            content:"",
            embeds: [
                new EmbedBuilder()
                    .setDescription("File cloning failed.")
                    .setColor("Red")
            ]
        })
    })
}

command.action = async (interaction, control, share) => {
    if (!submissions) submissions = share.get("Things") || new ModeratedSubmissionSystem<{name:string,image:string}>("Things",control,(emb,data) => emb.setDescription(data.name).setImage(data.image))
    
    await submissions.ready()

    switch(interaction.options.getSubcommand()) {
        case "info":
            interaction.editReply({embeds:[
                new EmbedBuilder()
                    .setTitle("/things")
                    .setDescription(
                        "This command allows you to add to a Smash or Pass list."
                        + " Your submissions will be moderated. Do not submit illegal"
                        + " content. Your images must be under 30mb & your tag will"
                        + " be viewable by both moderators and users who play through"
                        + " the Things list."
                    )
                    .setColor("Blurple")
            ]})
        break
        case "submit-file":
            submitThing(interaction,interaction.options.getString("name",true),interaction.options.getAttachment("file",true).url)
        break
        case "submit-url":
            submitThing(interaction,interaction.options.getString("name",true),interaction.options.getString("url",true))
        break
    }
}

module.exports = command