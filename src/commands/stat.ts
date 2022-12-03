import axios from "axios";
import { APIEmbedField } from "discord-api-types/v10"
import { EmbedBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";

// init slash command

let statMeta:{name:string,description:string,fetch:string,ua?:string}[] = require(`${process.cwd()}/assets/commands/stat/meta.json`)

let cm = new SlashCommandBuilder()
.setName("stat")
.setDescription("view stats")

statMeta.forEach((e) => {
    cm.addSubcommand(
        new SlashCommandSubcommandBuilder()
            .setName(e.name)
            .setDescription(e.description)
    )
})

let command = new SlashCommand(
    cm
)

command.allowInDMs = true

command.action = (interaction) => {
    return new Promise(async (resolve,reject) => {
        let cmd = interaction.options.getSubcommand(true)
        let m = statMeta.find(e => e.name == cmd)

        if (m) {
            await interaction.editReply({
                embeds:[
                    new EmbedBuilder()
                        .setColor("Blurple")
                        .setDescription("Loading...")
                ]
            })

            // get scraper
            let scraper = require(`${command.assetPath}scrapers/${cmd}.js`)

            await axios.get(m.fetch,{headers:{
                "User-Agent":m.ua ?? "Mozilla/5.0 (Windows NT 10.0; rv:107.0) Gecko/20100101 Firefox/107.0",
            }}).then((data) => {
                scraper(interaction,data.data).then((fields:APIEmbedField[]) => {
                    interaction.editReply({
                        embeds:[
                            new EmbedBuilder()
                                .setColor("Blurple")
                                .setDescription("Results")
                                .setFields(...fields)
                        ]
                    })
                })
            }).catch((err) => {
                console.error(err)
                reject("error")
            })
        }
    })
}

module.exports = command