import axios from "axios";
import { Cheerio, Element, load } from "cheerio";
import { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";

interface Result {
    title:string,
    content:string,
    url:string
}

let isElement = (element:Cheerio<any>):element is Cheerio<Element> => {
    return "tagName" in element
}

// Dear split,
//      
//      Get off your lazy ass and
//      stop using require() for this.
//
//                                   -split 

let lmgtfyCfg = require(`${process.cwd()}/assets/commands/lmgtfy/lmgtfy.json`)

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("lmgtfy")
        .setDescription(`Let Me Google That For You (searx instance: ${lmgtfyCfg.searx})`)
        .addStringOption(
            new SlashCommandStringOption()
                .setRequired(true)
                .setName("query")
                .setDescription("Search query")
        )
)

command.allowInDMs = true

command.action = async (interaction) => {
    let q = interaction.options.getString("query",true)

    /*

        I hope this doesn't make me look stupid.
        For some reason, the `format` parameter
        doesn't work on any searx instances
        that I try.
    
    */

    axios.get(`https://${lmgtfyCfg.searx}/?q=${encodeURIComponent(q.replace(/ /g,"+"))}&engines=google`).then((data) => {
        let $ = load(data.data)
        let results:Result[] = []
        
        // bad way of doing this, but it should be fine...

        $('div[id="urls"] article').map((x,v) => {
            let ob = $(v)

            let ResultTitle = ob.find("h3")
            let ResultDescription = ob.find(".content")
        
            if (!ResultTitle || !ResultDescription) return
            
            results.push({
                title:ResultTitle.text(),
                content:ResultDescription.text(),
                url:ResultTitle.find("a").attr("href")||"https://google.co.ck"
            })
        })

        let mapped = results.slice(0,3).map((res) => `[**${res.title.replace(/\*/g,"\\*").trim()}**](${res.url})\n*${res.content.replace(/\*/g,"\\*").trim()}*`)
    
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setAuthor({
                        name:lmgtfyCfg.searx,
                        url:`https://${lmgtfyCfg.searx}/?q=${encodeURIComponent(q.replace(/ /g,"+"))}&engines=google`,
                    })
                    .setTitle(`"${q}"`)
                    .setDescription(mapped.join("\n\n") || "No results")
                    .setColor("Blurple")
            ]
        })
    }).catch((err) => {
        console.error(err)
    })
}

module.exports = lmgtfyCfg.searx ? command : null