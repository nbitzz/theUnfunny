import { Client, SlashCommandBuilder, Routes, ChatInputCommandInteraction } from "discord.js";
import { Logger, Groups } from "./logger"

let csle = new Logger("SlashCommandManager")

new Groups.LoggerGroup(
    "commands",
    "255,150,150"
)

type anySCB = SlashCommandBuilder
              |Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
              |Omit<SlashCommandBuilder, "addBooleanOption" | "addUserOption" | "addChannelOption" | "addRoleOption" | "addAttachmentOption" | "addMentionableOption" | "addStringOption" | "addIntegerOption" | "addNumberOption">

export class SlashCommand {
    readonly builder: anySCB
    readonly assetPath: string
    readonly type:string = "SCM.SlashCommand"
    action?: (interaction:ChatInputCommandInteraction) => Promise<any>

    ephmeralReply?:boolean
    allowInDMs?:boolean

    constructor(command:anySCB) {
        this.builder = command
        this.assetPath = `${process.cwd()}/assets/commands/${command.name}/`
    }
}

export class SlashCommandManager {
    private commands:SlashCommand[] = []
    private readonly client: Client
    readonly type:string = "SCM.SlashCommandManager"

    constructor(client: Client) {
        this.client = client
    }

    /**
     * @description Register slash commands
     */
    register() {
        return new Promise(async (resolve,reject) => {
            csle.log("Registering commands...")
            
            if (this.client.user) {
                this.commands.forEach((e) => {
                    e.builder.setDMPermission(e.allowInDMs)
                })

                let result = await this.client.rest.put(
                    Routes.applicationCommands(this.client.user.id),
                    { body: this.commands.map(e => e.builder.toJSON()) }
                )

                csle.success("Slash commands registered.")
                resolve(result)
            } else {
                csle.error("Not logged in")
                reject("Not logged in")
            }
        })
    }

    /**
     * @description Process a command
     */

    call(int:ChatInputCommandInteraction) {
        let command = this.commands.find(e => e.builder.name == int.commandName)
        if (command && command.action) {
            int.deferReply({
                ephemeral:command.ephmeralReply
            }).then(() => {
                if (command && command.action) {
                    command.action(int).catch((err) => {
                        // error handling
                        int.editReply({
                            embeds:[
                                {description:"Oops, something broke. Maybe try that again?",color:0xff0000}
                            ]
                        })
                        csle.error(`An error occured while running /${command?.builder.name}:`)
                        console.error(err)
                    })
                }
            })

        }
    }

    /**
     * @description Add a slash command to the manager
     */
    add(command:SlashCommand) {
        this.commands.push(command)
    }
}

// type guard

export let isSlashCommand = (sc: any): sc is SlashCommand => {return sc&&sc.type=="SCM.SlashCommand"} 