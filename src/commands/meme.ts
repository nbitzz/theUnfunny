import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandAttachmentOption, SlashCommandBuilder, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { ModeratedSubmissionSystem } from "../lib/ModeratedSubmissionFramework";
import axios from "axios";

// init slash commands

let _config = require("../../config.json")

let submissions:ModeratedSubmissionSystem<string>

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("meme")
        .setDescription("Memes, I guess")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("info")
                .setDescription("More information about this command")
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("get")
                .setDescription("View a meme in the database. Leave id blank for a random one.")
                .addNumberOption(
                    new SlashCommandNumberOption()
                        .setMinValue(1)
                        .setName("number")
                        .setRequired(false)
                        .setDescription("Submission index")
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("submit-file")
                .setDescription("Submit a meme to be reviewed by this instance's moderation team")
                .addAttachmentOption(
                    new SlashCommandAttachmentOption()
                        .setName("file")
                        .setDescription("Meme to submit")
                        .setRequired(true)
                )
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("submit-url")
                .setDescription("Submit a meme to be reviewed by this instance's moderation team")
                .addStringOption(
                    new SlashCommandStringOption()
                        .setName("url")
                        .setDescription("Meme to submit")
                        .setRequired(true)
                )
        )
)

async function submitURL(interaction:ChatInputCommandInteraction,url:string) {
    await interaction.editReply("Requesting file clone...")
    axios.post(`${_config.monofile}/clone`,JSON.stringify({url:url}),{headers:{"Content-Type":"text/plain"}}).then(async (data) => {
        await interaction.editReply("Reviewing file...")

        let d = await axios.get(`${_config.monofile}/file/${data.data}`,{responseType:"arraybuffer"})

        if (
            !(d.headers["content-type"] 
            && (d.headers["content-type"].startsWith("video/") 
            || d.headers["content-type"].startsWith("image/")))
            ) await interaction.editReply("Invalid file type.")

        if (d.data.byteLength >= 75*1024*1024) await interaction.editReply("File too large.")

        await submissions.submit(interaction.user,`${d.headers["content-type"]?.split("/")[0]}/${data.data}`)
    
        interaction.editReply({
            content:"",
            embeds: [
                new EmbedBuilder()
                    .setDescription("Your meme has been submitted.")
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
    if (!submissions) submissions = share.get("memeSubmissionSystem") || new ModeratedSubmissionSystem("memes",control,(emb,url) => 
        url.split("/")[0] == "video" 
        ? emb.setDescription(`Sent a video: ${_config.monofile}/file/${url.split("/")[1]}`) 
        : emb.setImage(`${_config.monofile}/file/${url.split("/")[1]}`)
    )
    
    await submissions.ready()

    switch(interaction.options.getSubcommand()) {
        case "info":
            interaction.editReply({embeds:[
                new EmbedBuilder()
                    .setTitle("/meme")
                    .setDescription(
                        "This command allows you to submit memes & have them be viewed by other users."
                        + `\nDo NOT submit illegal content. All content will be cloned onto the monofile`
                        + ` instance being used by this bot's owner.\n\n`
                        + `Your memes must be smaller than 75mb, and will be reviewed by the moderation team`
                        + ` that has been employed by this bot's owner. Your tag will be included in the submission,`
                        + ` and will be visible to others.`
                    )
                    .setColor("Blurple")
            ]})
        break
        case "get":
            let subs = submissions.getSubmissions()
            if (subs.length == 0) {
                interaction.editReply({embeds:[
                    new EmbedBuilder()
                        .setTitle("Uh-oh!")
                        .setDescription(
                            "No submissions found. Why don't you submit something?"
                        )
                        .setColor("Red")
                ]})
            } else {
                let id = (interaction.options.getNumber("number") || Math.floor(Math.random()*subs.length)+1)-1

                if (subs[id]) {
                    let file_id = subs[id].data.split("/")[1]

                    let userTag = await interaction.client.users.fetch(subs[id].author).then((user) => user.tag).catch(() => "❔")

                    interaction.editReply({
                        content:`${_config.monofile}/file/${file_id}`,
                        components:[
                            new ActionRowBuilder<ButtonBuilder>()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setStyle(ButtonStyle.Link)
                                        .setLabel(`#${id+1}`)
                                        .setEmoji("💾")
                                        .setURL(`${_config.monofile}/download/${file_id}`),
                                    new ButtonBuilder()
                                        .setStyle(ButtonStyle.Success)
                                        .setDisabled(false)
                                        .setCustomId("___")
                                        .setLabel(`submitted by ${userTag}`),
                                    new ButtonBuilder()
                                        .setLabel("Trace")
                                        .setStyle(ButtonStyle.Link)
                                        .setURL(`https://discord.com/channels/${submissions.channel?.guild.id}/${submissions.channel?.id}/${subs[id].message}`)
                                )
                        ]
                    })
                } else {
                    interaction.editReply({embeds:[
                        new EmbedBuilder()
                            .setTitle("Uh-oh!")
                            .setDescription(
                                "A submission with this ID wasn't found."
                            )
                            .setColor("Red")
                    ]})
                }
            }
        break
        case "submit-file":
            submitURL(interaction,interaction.options.getAttachment("file",true).url)
        break
        case "submit-url":
            submitURL(interaction,interaction.options.getString("url",true))
        break
    }
}

module.exports = command