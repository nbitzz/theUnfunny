import { Client, Collection, SlashCommandBuilder, REST, Routes, ChatInputCommandInteraction } from "discord.js";

export class SlashCommand {
    readonly builder: SlashCommandBuilder|Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
    readonly assetPath: string
    readonly type:string = "SCM.SlashCommand"
    action?: (interaction:ChatInputCommandInteraction) => void

    ephmeralReply?:boolean

    constructor(command:SlashCommandBuilder|Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">,) {
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
            console.log("[SlashCommandManager] Registering commands...")
            
            if (this.client.user) {
                let result = await this.client.rest.put(
                    Routes.applicationCommands(this.client.user.id),
                    { body: this.commands.map(e => e.builder.toJSON()) }
                )

                console.log(`[SlashCommandManager] Slash commands registered.`)
                resolve(result)
            } else {
                console.error("[SlashCommandManager] Not logged in")
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
            })

            // error handling (lol)
            try {
                command.action(int)
            } catch(err) {
                int.reply({
                    ephemeral:true,
                    content:"Oops, something broke. Try that again, maybe?"
                })
                console.error(err)
            }
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

export let isSlashCommand = (sc: any): sc is SlashCommand => {return sc.type=="SCM.SlashCommand"} 