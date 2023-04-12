import { Message } from "discord.js";
import { CommandAndControl } from "./CommandAndControl";
import { SlashCommandManager } from "./SlashCommandManager";
import { Logger } from "./logger";
import fs from "fs/promises";

let csle = new Logger("Managers","Library")

export abstract class BaseChannelManager {
    
    control: CommandAndControl
    commands: SlashCommandManager

    constructor( control: CommandAndControl, commands: SlashCommandManager ) {

        this.control = control;
        this.commands = commands;

    }

    abstract recieve ( message: Message ) : void
    abstract readonly name : string

}

/* get each manager, bnad way of doihng it but who cares */

export class ChannelManagerController {

    readonly control: CommandAndControl
    readonly command: SlashCommandManager

    readonly ChannelManagers: Map<string, BaseChannelManager> = new Map();

    links: Map<string, BaseChannelManager> = new Map();

    constructor( control: CommandAndControl, command: SlashCommandManager ) {
        
        this.control = control;
        this.command = command;

        fs.readdir(process.cwd()+"/out/managers").then((fn) => {
            fn.forEach((name) => {
                csle.log(`Loading ${fn}`)

                let manager:BaseChannelManager = 
                    require(process.cwd()+"/out/managers/"+name)
                    .get( control, command )
                

                csle.success(`Loaded ${fn} as ${manager.name}`)
                
                this.ChannelManagers.set(manager.name,manager)
            })
        })

        csle.success(`Loaded ${this.ChannelManagers.size} managers`)
    
        let client = control.client;

        client.on("messageCreate", (message) => {
            let manager = this.links.get(message.channel.id)

            if (manager) manager.recieve(message)
        })

        csle.log("Attempting to load managers")
        this.load()

    }

    save() {
        let newTab:{[key:string]:string} = {}

        this.links.forEach((v,k) => {
            newTab[k] = v.name
        })

        fs.writeFile(`${process.cwd()}/.data/ChannelManagers.json`,JSON.stringify(newTab))
        .then(() => {
            csle.success("saved")
        })
        .catch((err) => {
            csle.error("error saving cms")
            csle.error(err)
        })
    }

    load() {
        fs.readFile(`${process.cwd()}/.data/ChannelManagers.json`).then((buf) => {
            let j:{[key:string]:string} = JSON.parse(buf.toString())

            for (let [key,value] of Object.entries(j)) {
                let man = this.ChannelManagers.get(value)
                if (man) this.links.set(key, man)
            }

            csle.success("loaded")
        }).catch((err) => {
            csle.error("error loading cms")
            csle.error(err)
        })
    }
    
}