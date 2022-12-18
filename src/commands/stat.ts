import axios, { AxiosError } from "axios";
import { APIEmbedField, ComponentType } from "discord-api-types/v10"
import { ActionRowBuilder, EmbedBuilder, SelectMenuBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { Logger, Groups } from "../lib/logger"

let csle = new Logger("stat","commands")
let statLogs = new Groups.LoggerGroup("stat","200,200,0")
let scraperLoggers:Map<string,Logger> = new Map();

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
    return new Promise<void>(async (resolve,reject) => {
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
            let scraperLogger = scraperLoggers.get(cmd) || new Logger(cmd,statLogs)

            await axios.get(m.fetch,{headers:{
                "User-Agent":m.ua ?? "Mozilla/5.0 (Windows NT 10.0; rv:107.0) Gecko/20100101 Firefox/107.0",
            }}).then((data) => {
                scraper(interaction,data.data,scraperLogger).then(async (fields:APIEmbedField[]) => {
                    let statMessage = await interaction.editReply({
                        embeds:[
                            new EmbedBuilder()
                                .setColor("Blurple")
                                .setDescription("Results")
                                .setFields(...fields)
                        ],
                        components:[
                            new ActionRowBuilder<SelectMenuBuilder>()
                                .addComponents(
                                    new SelectMenuBuilder()
                                        .setCustomId("copy")
                                        .setPlaceholder("Get raw value...")
                                        .addOptions(
                                            ...fields.map((v,x) => {
                                                return {
                                                    label:v.name,
                                                    value:x.toString(),
                                                    description:`${v.value.length} characters`
                                                }
                                            })
                                        )
                                )
                        ]
                    })

                    let coll = statMessage.createMessageComponentCollector(
                        {
                            componentType:ComponentType.StringSelect,
                            idle:60000
                        }
                    )

                    coll.on("collect",(int) => {
                        if (!int.values[0]) return
                        int.reply({
                            ephemeral:true,
                            content:fields[parseInt(int.values[0],10)].value
                        })
                    })
                    
                    coll.on("end",() => {
                        fields = [];
                        statMessage.edit({components:[]})
                        resolve()
                    })
                })
            }).catch((err) => {
                scraperLogger.error(err instanceof AxiosError ? `Failed to fetch data from ${err.config?.url}: ${err.code}` : "Failed to generate stat information")
                reject("error")
            })
        }
    })
}

module.exports = command