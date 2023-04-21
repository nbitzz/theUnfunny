import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, SlashCommandAttachmentOption, SlashCommandBuilder, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
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
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("leaderboard")
                .setDescription("View leaderboards")
        )
)

async function submitURL(interaction:ChatInputCommandInteraction,url:string) {
    await interaction.editReply("Requesting file clone...")                 // discord developers are genius, need to do this to fix gif playback
                                                                            // could probably check content-type but would rather not have to reupload etc                               
    axios.post(`${_config.monofile}/clone`,JSON.stringify({url:url,uploadId:url.endsWith(".gif") ? Math.random().toString().slice(2)+".gif" : undefined}),{headers:{"Content-Type":"text/plain"}}).then(async (data) => {
        await interaction.editReply("Reviewing file...")

        let d = await axios.get(`${_config.monofile}/file/${data.data}`,{responseType:"arraybuffer"})

        if (
            !(d.headers["content-type"] 
            && (d.headers["content-type"].startsWith("video/") 
            || d.headers["content-type"].startsWith("image/")))
            ) {await interaction.editReply("Invalid file type.");return}

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

let createBar = (val:number,max:number,size:number=10) => {
    let per = Math.round((val/max)*size)
    return "█".repeat(per)+"░".repeat(size-per)
}

command.action = async (interaction, control, share) => {
    if (!submissions) submissions = share.get("memeSubmissionSystem")
    
    await submissions.ready()

    switch(interaction.options.getSubcommand()) {
        case "info":
            let sbs = submissions.getSubmissions()
            let userSbs = sbs.filter(e => e.author == interaction.user.id)
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
                    .setFields(
                        {name:"In Database",value:`${sbs.length} accepted\n${submissions.data.submissions.filter(e => !e.moderated).length} pending`, inline:true},
                        {name:"Your Submissions",value:`${userSbs.length} accepted (${Math.round(userSbs.length/sbs.length*100)}%)\n${submissions.data.submissions.filter(e => e.author == interaction.user.id && !e.moderated).length} pending`,inline:true}
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

                    /*
                        Do you think God stays in heaven 
                        because he too lives in fear of 
                        what he's created?
                    */

                    let getComp = () => {
                        return new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(
                                new ButtonBuilder()
                                    .setStyle(ButtonStyle.Link)
                                    .setLabel(`#${id+1}`)
                                    .setEmoji("💾")
                                    .setURL(`${_config.monofile}/download/${file_id}`),
                                new ButtonBuilder()
                                    .setStyle(ButtonStyle.Primary)
                                    .setDisabled(false)
                                    .setCustomId("___")
                                    .setLabel(`submitted by ${userTag}`),
                                new ButtonBuilder()
                                    .setStyle((subs[id].favorites||[]).find(e => e == interaction.user.id) ? ButtonStyle.Success : ButtonStyle.Secondary)
                                    .setDisabled(false)
                                    .setCustomId(`mfav`)
                                    .setEmoji("⭐")
                                    .setLabel((subs[id].favorites||[]).length.toString()),
                                new ButtonBuilder()
                                    .setLabel("Trace")
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(`https://discord.com/channels/${submissions.channel?.guild.id}/${submissions.channel?.id}/${subs[id].message}`)
                            )
                    }

                    interaction.editReply({
                        content:`${_config.monofile}/file/${file_id}`,
                        components:[
                            getComp()
                        ]
                    }).then((ms) => {

                        let coll = ms.createMessageComponentCollector({
                            componentType: ComponentType.Button,
                            filter: (int) => int.customId == "mfav",
                            idle:90000
                        })

                        coll.on("collect", async (int) => {
                            int.deferUpdate();

                            await submissions.favorite(subs[id].id,int.user.id)

                            interaction.editReply({
                                components: [
                                    getComp()
                                ]
                            })
                        })
                        
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
        case "leaderboard":
            let _subs = submissions.getSubmissions()
            // horrifying to wrap your head around so
            // i just got copilot to write it lol
            // god this is making me lazier by the second
            let most_favorites = Object.entries(_subs).sort((a,b) => (b[1].favorites||[]).length-(a[1].favorites||[]).length)

            let userCounts:{[key:string]:number} = {}

            for (let sub of _subs) {
                if (userCounts[sub.author]) userCounts[sub.author]++
                else userCounts[sub.author] = 1
            }

            let most_submissions = Object.entries(userCounts).sort((a,b) => b[1]-a[1])

            // arr for most submissions leaderboard

            let subs_top5 = []

            for (let i = 0; i < 5; i++) {
                if (!most_submissions[i]) break
                let user = await interaction.client.users.fetch(most_submissions[i][0]).then((user) => user.tag).catch(() => "❔")
                let tpb = user == interaction.user.tag ? "*" : ""
                subs_top5.push(`**${tpb}${i+1}${tpb}** \`${user}\` with \`${most_submissions[i][1]}\` submission(s) (${Math.round(most_submissions[i][1]/_subs.length*100)}%)`)
            }

            // NOT good 
            // KILL ME.
            // i can only hope that my future employer
            // (if applicable, etc.) will NOT,
            // under any circumstances, see this code
            
            if (!most_submissions.find(e => e[0] == interaction.user.id)) {
                subs_top5.push(`***${most_submissions.findIndex(e => e[0] == interaction.user.id) || "?"}.*** \`${interaction.user.tag}\` with \`${userCounts[interaction.user.id] || 0}\` submission(s) (${Math.round((userCounts[interaction.user.id] || 0)/_subs.length*100)})`)
            }

            // arr for most favorites leaderboard

            let favs_top5 = []

            for (let i = 0; i < 5; i++) {
                if (!most_favorites[i]) break
                let user = await interaction.client.users.fetch(most_favorites[i][1].author).then((user) => user.tag).catch(() => "❔")
                favs_top5.push(`**${i+1}.** \`#${parseInt(most_favorites[i][0],10)+1}\` by \`${user}\` with ⭐ **${(most_favorites[i][1].favorites||[]).length}**`)
            }

            let leaderboard_embed = new EmbedBuilder()
                .setTitle("/meme leaderboards")
                .addFields(
                    {
                        name:"Most Submissions",
                        value:subs_top5.join("\n"),
                    },
                    {
                        name:"Most Favorites",
                        value:favs_top5.join("\n")
                    }
                )
                .setColor("Blurple")

            interaction.editReply({embeds:[leaderboard_embed]})
    }
}

module.exports = command