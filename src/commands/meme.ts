import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, ModalBuilder, SlashCommandAttachmentOption, SlashCommandBuilder, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { ModeratedSubmissionSystem, type Submission } from "../lib/ModeratedSubmissionFramework";
import axios from "axios";
import { AltTextSuggestions } from "../lib/AltTextSubmission";
import { getPolicy, ilibpolicy } from "../lib/ServerPolicy";
import authenticate_monofile from "../lib/authenticate_monofile";

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

async function submitURL(interaction:ChatInputCommandInteraction,url:string,share:Map<string,any>) {
    
    if (_config.monofile_credentials) {
        if (!share.get("monofileAuthKey")) {
            await interaction.editReply(`Logging in as ${_config.monofile_credentials.username}...`)
            await authenticate_monofile(share)
        }

        // test auth
        await (axios.get(`${_config.monofile}/auth/me`, 
            { 
                headers: { 
                    "Cookie": `auth=${share.get("monofileAuthKey")};` 
                }
            }
        ).catch(async () => {
            await interaction.editReply(`Logging in as ${_config.monofile_credentials.username}...`); return authenticate_monofile(share)
        }))
    }

    await interaction.editReply("Requesting file clone...")
    axios.post(
        `${_config.monofile}/clone`,
        JSON.stringify({
            url,
            uploadId:url.endsWith(".gif") ? Math.random().toString().slice(2)+".gif" : undefined
        }),
        {
            headers: {
                "Content-Type":"text/plain",
                ...(
                    share.has("monofileAuthKey") 
                    ? {"Cookie": `auth=${share.get("monofileAuthKey")};`} 
                    : {}
                )
            }
        }
    ).then(async (data) => {
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

command.action = async (interaction, control, share) => {
    if (!submissions) submissions = share.get("memeSubmissionSystem")
    
    await submissions.ready()

    switch(interaction.options.getSubcommand()) {
        case "info":
            let sbs = submissions.getSubmissions()
            let userSbs = sbs.filter(e => e.author == interaction.user.id)

            let hazardCpnts:ActionRowBuilder<ButtonBuilder>[] = []

            if (interaction.guild?.id && interaction.guild?.id == control.guild?.id) {
                // this could probably be optimized but itll look worse + it'll be a matter of milliseconds to nanoseconds
                for (let y = 0; y < 3; y++) {
                    let builder = new ActionRowBuilder<ButtonBuilder>()
                    for (let x = 0; x < 3; x++) {
                        builder.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`___:${x}${y}`)
                                .setStyle(ButtonStyle.Secondary)
                                .setLabel(sbs.filter(e => e.hazards && e.hazards.insensitivity == x && e.hazards.sexualContent == y).length.toString())
                        )
                    }
                    hazardCpnts.push(builder)
                }
            }

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
                        {name:"In Database",value:`${sbs.length} accepted\n${sbs.filter(e => e.altText).length} (${Math.round(sbs.filter(e => e.altText).length/sbs.length*100)}%) searchable\n${sbs.filter(e => e.hazards).length} (${Math.round(sbs.filter(e => e.hazards).length/sbs.length*100)}%) content-rated\n${submissions.data.submissions.filter(e => !e.moderated).length} pending`, inline:true},
                        {name:"Your Submissions",value:`${userSbs.length} accepted (${Math.round(userSbs.length/sbs.length*100)}%)\n${submissions.data.submissions.filter(e => e.author == interaction.user.id && !e.moderated).length} pending`,inline:true}
                    )
                    .setColor("Blurple")
            ], components: hazardCpnts})
        break
        case "get":
            let subs = submissions.getSubmissions()
            let fSubs = subs
            if (interaction.guild) {
                // @ts-ignore tired
                let scL = ilibpolicy.policies.permittedSexualContent.choices.indexOf(getPolicy(interaction.guild?.id,"permittedSexualContent"))
                // @ts-ignore tired
                let isL = ilibpolicy.policies.permittedLanguage.choices.indexOf(getPolicy(interaction.guild?.id,"permittedLanguage"))

                fSubs = subs.filter(e => (e.hazards||{sexualContent:2}).sexualContent <= scL && (e.hazards||{insensitivity:2}).insensitivity <= isL)
            }

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
                // serious mess but it's.. fine for now.
                let id = (interaction.options.getNumber("number") || subs.indexOf(fSubs[Math.floor(Math.random()*fSubs.length)])+1)-1

                if (subs[id]) {
                    if (interaction.guild && interaction.options.getNumber("number")) {
                        // @ts-ignore tired
                        let scL = ilibpolicy.policies.permittedSexualContent.choices.indexOf(getPolicy(interaction.guild?.id,"permittedSexualContent"))
                        // @ts-ignore tired
                        let isL = ilibpolicy.policies.permittedLanguage.choices.indexOf(getPolicy(interaction.guild?.id,"permittedLanguage"))
                        
                        if ((subs[id].hazards||{sexualContent:2}).sexualContent > scL || (subs[id].hazards||{insensitivity:2}).insensitivity > isL) {
                            interaction.editReply({embeds:[
                                new EmbedBuilder()
                                    .setTitle("Uh-oh!")
                                    .setDescription(
                                        "This meme does not match this server's content ratings. Please either weaken your policies or use this command in your direct messages."
                                    )
                                    .setColor("Red")
                            ]})
                            return
                        }
                    }

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
                                    .setStyle(subs[id].altText ? ButtonStyle.Success : ButtonStyle.Secondary)
                                    .setDisabled(false)
                                    .setCustomId(`search`)
                                    .setEmoji(subs[id].altText ? "✔️" : "✖️")
                                    .setLabel(subs[id].altText ? "Searchable" : "Not searchable"),
                                ...(interaction.guildId && interaction.guildId == control?.guild?.id ? [new ButtonBuilder()
                                    .setLabel("Trace")
                                    .setStyle(ButtonStyle.Link)
                                    .setURL(`https://discord.com/channels/${submissions.channel?.guild.id}/${submissions.channel?.id}/${subs[id].message}`)
                                ] : [])
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
                            filter: (int) => int.customId == "mfav" || int.customId == "search",
                            idle:300000
                        })

                        coll.on("collect", async (int) => {
                            if (int.customId == "mfav") {
                                int.deferUpdate();

                                await submissions.favorite(subs[id].id,int.user.id)

                                interaction.editReply({
                                    components: [
                                        getComp()
                                    ]
                                })
                            } else {
                                let rep = await int.reply({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setColor(subs[id].altText ? "Blurple" : "Red")
                                            .setTitle(`This meme has ${subs[id].altText ? "" : "no"} alt text available`)
                                            .setDescription(subs[id].altText || "This meme has no alt text available. You can suggest alt text by clicking the button below. (Button will be enabled when suggestion feature is complete.)\nAlt text is used in theUnfunny memedb for search features (upcoming.) We expect submitted alt text to be of a high quality, including grammar & correct spelling.")
                                    ],
                                    components: [
                                        ...(!subs[id].altText ? [
                                            new ActionRowBuilder<ButtonBuilder>()
                                                .addComponents(
                                                    new ButtonBuilder()
                                                        .setStyle(ButtonStyle.Success)
                                                        .setLabel("Suggest alt text")
                                                        .setCustomId("suggest")
                                                )
                                        ] : [])
                                    ],
                                    ephemeral: true
                                })

                                if (subs[id].altText) return

                                let cl2 = rep.createMessageComponentCollector({
                                    componentType: ComponentType.Button,
                                    filter: (int) => int.customId == "suggest",
                                    time:120000
                                })

                                let mdlId = Math.random().toString()

                                cl2.on("collect", (int) => {
                                    int.showModal(
                                        new ModalBuilder()
                                            .setCustomId(mdlId)
                                            .setTitle("Suggest alt text")
                                            .addComponents(
                                                new ActionRowBuilder<TextInputBuilder>()
                                                    .addComponents(
                                                        new TextInputBuilder()
                                                            .setRequired(true)
                                                            .setStyle(TextInputStyle.Paragraph)
                                                            .setPlaceholder("Transcribe text and audio & describe contents in extreme detail")
                                                            .setCustomId("text")
                                                            .setMaxLength(2048)
                                                            .setLabel("Alt text")
                                                    )
                                            )
                                    )

                                    int.awaitModalSubmit({
                                        "time": 120000,
                                        filter: (int) => int.customId == mdlId 
                                    }).then((mdlSub) => {
                                        int.deleteReply()
                                        mdlSub.deferUpdate()

                                        let alt = mdlSub.fields.getTextInputValue("text")

                                        if (alt) {
                                            let s = share.get("memeAltTextSubmissionSystem") as AltTextSuggestions
                                            s.submit(int.user, { text: alt, submissionid: subs[id].id })
                                        }
                                    }).catch(() => {int.deleteReply()})
                                    
                                })
                            }
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
            submitURL(interaction,interaction.options.getAttachment("file",true).url, share)
        break
        case "submit-url":
            submitURL(interaction,interaction.options.getString("url",true), share)
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
                subs_top5.push(`**${tpb}${i+1}.${tpb}** \`${user}\` with \`${most_submissions[i][1]}\` submission(s) (${Math.round(most_submissions[i][1]/_subs.length*100)}%)`)
            }

            // NOT good 
            // KILL ME.
            // i can only hope that my future employer
            // (if applicable, etc.) will NOT,
            // under any circumstances, see this code
            
            if (!most_submissions.slice(0,5).find(e => e[0] == interaction.user.id)) {
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

// check for monofile before enabling the funny command
if (_config.monofile) module.exports = command