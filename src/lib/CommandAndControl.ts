import { Client, SlashCommandBuilder, Routes, ChatInputCommandInteraction } from "discord.js";
import { EZSave, getSave } from "./ezsave";
import { Logger } from "./logger"
import { BaseEvent, EventSignal } from "./Events"

let csle = new Logger("CommandAndControl","Library")

export interface CommandAndControlSettings {
    UGC_STATUSES?: boolean
}

export interface CommandAndControlData {
    guild?    : string
    owner?    : string
    settings? : CommandAndControlSettings
}

export let CommandAndControlDefaults:CommandAndControlSettings = {
    UGC_STATUSES: false
}

export class CommandAndControl {
    readonly client: Client
    readonly save  : EZSave<CommandAndControlData>
    isReady        : boolean=false

    constructor (client:Client) {
        this.client = client;
        this.save = getSave(`${process.cwd()}/.data/commandandcontrol.json`)
        this.fetch().then(() => this.isReady=true)
    }

    ready() {
        return new Promise<void>((resolve,reject) => {
            if (this.isReady) resolve()
        })
    }

    private fetch() {
        return new Promise(async (resolve,reject) => {
            // wait for save to be ready
            await this.save.ready()
            csle.info("Fetching information...")
        })
    }

    
}