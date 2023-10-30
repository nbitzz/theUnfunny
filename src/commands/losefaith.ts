import axios from "axios";
import { AttachmentBuilder, EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { fetchPostCountForTag } from "../lib/rule34"
import { EZSave, getSave } from "../lib/ezsave"

// you can change these if you're selfhosting i guess

let MAX_PAGES = 100
let save:EZSave<HistoryFrame[]> = getSave(`${process.cwd()}/.data/taghistory.json`)

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("losefaith")
        .setDescription("Get the amount of results for a set of rule34.xxx tags")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("tags")
                .setDescription("R34 tag set to check")
                .setRequired(false)
                .setMaxLength(250)
        )
)

let defaultList : string[] = require(command.assetPath+"Defaults.json")

// probvably didn't need to note all of these props down but whatever i don't car

interface R34ApiResponse {
    preview_url: string,
    sample_url:string,
    file_url:string,
    directory:number,
    hash:string,
    height:number,
    id:number,
    image:string,
    change:number,
    owner:string,
    parent_id:number,
    rating:"safe" | "questionable" | "explicit",
    sample:number,
    sample_height:number,
    sample_width:number,
    score:number,
    tags:string,
    width:string
}

let getApiPosts = async function(character:string):Promise<R34ApiResponse[]> {
    
    let posts:R34ApiResponse[] = []

    for (let i = 0; i < MAX_PAGES; i++) {
        let res = await axios.get(`https://api.rule34.xxx/index.php?page=dapi&s=post&q=index&json=1&limit=1000&tags=${encodeURIComponent(character)}&pid=${i}`)
        posts.push(...res.data)
        if (res.data.length<1000) break
    }

    return posts

}

interface HistoryFrame {
    time  : number
    count : number
}

command.allowInDMs = true

command.action = async (interaction) => {
    let character : string = 
        (interaction.options.getString("tags",false) 
        || defaultList[
            Math.floor(
                Math.random()*defaultList.length
            )
        ]).trim()
    
    let tags = character.toLowerCase().split(" ").filter(e => !!e)

    let embed = new EmbedBuilder()
        .setTitle("/losefaith")
        .setColor("Blurple")

    let stTotal = 0
    
    let history:HistoryFrame[] = []

    if (tags.length == 1) {
        stTotal = await fetchPostCountForTag(tags[0])
        history = save.data[tags[0]] || []
    }

    embed.setDescription(
        tags.length == 1                 // if stTotal - 1 != 0, add an s
        ? `There are **${stTotal}** result${stTotal-1 ? "s" : ""} for \`${tags.join(" ").replace(/\`/g,"")}\` on rule34.xxx.\n`
        + (history&&history.length>0 
            ? `Last checked <t:${Math.round(history[history.length-1].time/1000)}:R> with **${history&&history[history.length-1].count}** result(s).` 
            : "")
        : `Give me a sec...`
    )


    // if only 1 tag, make sure total is under max. else just get all
    let getStatistics = (tags.length == 1 && stTotal <= MAX_PAGES*1000) || tags.length > 1 

    // if 1 tag, push it into history

    if (tags.length == 1) {
        history.push({count:stTotal,time:Date.now()})
        save.set_record(tags[0],history)
    }

    if (getStatistics) {
        embed
            .setColor("Green")
            .setFooter({ text: "Hang on while we fetch more information; this may take a bit" })
    }

    await interaction.editReply({embeds: [embed]})

    if (!getStatistics) return

    let apiPosts = await getApiPosts(tags.join(" "))

    /* 

        Calculations

    */

    /* Tag popularity */

    let popularity:{[key:string]:number} = {}

    for (let v of apiPosts) {
        for (let tag of v.tags.split(" ")) {
            if (tag != tags[0]) popularity[tag] = (popularity[tag]||0) + 1
        }
    }

    // Sort it

    let sortedPopularity = Object.entries(popularity).sort((a,b) => b[1]-a[1])

    /* Rating */

    let rating = {
        safe:0,
        questionable:0,
        explicit:0
    }

    for (let v of apiPosts) {
        rating[v.rating]++
    }

    /*
    
        Was testing this out on niko_(oneshot) and...

        God will not forgive your sins. 
        God will not forgive your sins. 
        God will not forgive your sins. 
        God will not forgive your sins. 
        God will not forgive your sins. 

    */

    /*
        Update with statistics...
    */

    if (tags.length > 1) {
        stTotal = apiPosts.length
        embed.setDescription(
            `There are **${stTotal}** result${stTotal-1 ? "s" : ""} for \`${tags.join(" ").replace(/\`/g,"")}\` on rule34.xxx.\n`
            + `Capped at \`\`${MAX_PAGES*1000}\`\` for issues regarding performance.`
        )
    }

    let createBar = (val:number,max:number,size:number=10) => {
        let per = Math.round((val/max)*size)
        // hoping this fixes it
        return "█".repeat(Math.min(Math.max(per,0),size))+"░".repeat(Math.min(Math.max(size-per,0),size))
    }

    // We don't need descriptors of the character.
    // This filters them out.
    // I know we don't need to match for most of these, but it's fine.
    // this code is kind of a piece of shit but I Do not care.

    let blocked_kwds = [
        // covers basic properties of a character
        "mammal", "humanoid", "anthro", "feline",
        // meta tags
        "video_games", "digital_media_(artwork)", "absurd_res", "hi_res",
        // descriptors
        "eyes", "hair",
        // likely unneeded
        "girls", "1girl", "boys", "1boy"
    ]

    let blocked = new RegExp(blocked_kwds.join("|"))
    
    // this is extremely inefficient but i really don't care
    let descriptorFiltered = sortedPopularity.filter((e) =>
        !(e[0].match(blocked)||[])[0] 
        && !tags.join(" ").includes(e[0])
    )

    embed.setDescription(
        (embed.data.description||"")
        + `\nTotal user score: ${[0,...apiPosts.map(e=>e.score)].reduce((prev,cur) => prev+cur)}`
        + "\n\n**Popular associated tags**\n"
        + descriptorFiltered.slice(0,14).map(e => {
            let percentage = Math.floor((e[1]/stTotal)*100)
            return `\`\`${createBar(e[1],stTotal,14)} ${e[1]} (${percentage}%)\`\` ${e[0].replace(/\*/g,"\\*")}`
        }).join("\n")
    )
    .setColor("Blurple")
    .setFooter(null)

    // now add bar graphs for ratings to description
    // i let copilot do this cause lazy
    // not like my code would be any better
    embed.setDescription(
        embed.data.description
        + "\n\n**Rating distribution**\n"
        + `\`\`${createBar(rating.safe,stTotal,14)} ${rating.safe} (${Math.floor((rating.safe/stTotal)*100)}%)\`\` rated safe`
        + `\n\`\`${createBar(rating.questionable,stTotal,14)} ${rating.questionable} (${Math.floor((rating.questionable/stTotal)*100)}%)\`\` rated questionable`
        + `\n\`\`${createBar(rating.explicit,stTotal,14)} ${rating.explicit} (${Math.floor((rating.explicit/stTotal)*100)}%)\`\` rated explicit`
    )

    // Send it back
    
    interaction.editReply({
        embeds: [embed],
        files: [
            new AttachmentBuilder(
                Buffer.from(
                    `Popular associated tags for ${tags.join(" ")}\n`
                    + `https://github.com/nbitzz/theUnfunny\n${"-".repeat(40)}\n`
                    + sortedPopularity.map(e => {
                        let percentage = Math.floor((e[1]/stTotal)*100)
                        return `${createBar(e[1],stTotal,24)} ${e[1]} (${percentage}%) ${e[0]}`
                    }).join("\n")
                )
            )
            .setName(`associated.txt`)
        ]
    })
    
}

module.exports = command
