import axios from "axios";
import { load } from "cheerio";
import { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("wish")
        .setDescription("When you wish on wish.com, you can buy... human teeth!")
        .addStringOption(
            new SlashCommandStringOption()
                .setName("query")
                .setRequired(true)
                .setDescription("Your wish")
                .setMaxLength(128)
        )
)

command.action = async (interaction) => {
    await interaction.editReply({
        embeds:[
            new EmbedBuilder()
                .setColor("Blurple")
                .setDescription("Granting your wish...")
        ]
    })

    // grab wish webpage, use cheerio

    let wish = await axios.get(`https://wish.com/search/${encodeURIComponent(interaction.options.getString("query",true))}`)
    let $ = load(wish.data)

    // get results

    let results = $("div[width=210px]").map((x,v) => {
        return $(v)
            .find("div[class]")
            .attr("class")
            ?.startsWith("FeedBrandCollectionTitle")
            ? null : v
    })

    if (results.length == 0) {
        await interaction.editReply({
            embeds:[
                new EmbedBuilder()
                    .setColor("Red")
                    .setDescription("Couldn't find anything for that, sorry!")
            ]
        })
    } else {

        let item = results[Math.floor(Math.random()*results.length)]

        let item_hyperlink = $(item).find("a[scaleonhover=1]")
        let item_image = item_hyperlink.find("img[alt]")

        let url = item_hyperlink.attr("href")
        let image = item_image.attr("src")
        let tags = item_image.attr("alt")

        interaction.editReply({
            embeds:[
                new EmbedBuilder()
                    .setColor("Green")
                    .setAuthor({name:"Your wish has been granted"})
                    .setDescription(`Tagged "${tags}"\n[View product](https://wish.com${url})`)
                    .setImage(image || null)
            ]
        })

    }
}

module.exports = command