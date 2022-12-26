/*
    could probably use ezsave for this
*/

import { Logger, Groups } from "./logger";
import { CommandAndControl } from "./CommandAndControl";
import { EmbedBuilder, TextChannel } from "discord.js";
import { BaseEvent, EventSignal } from "./Events";
import { EZSave } from "./ezsave";

export const SubmissionSystemGroup = new Groups.LoggerGroup("ModeratedSubmissionSystem","69,69,69")
export const csle                  = new Logger("ModeratedSubmissionFramework","Library")

export interface Submission {
    authorId: string,
    value   : string
}

export class ModeratedSubmissionSystem {
    name        : string
    safeName    : string

    control     : CommandAndControl
    logger      : Logger
    channel?    : TextChannel
    save        : EZSave<Submission[]>

    _readyEvent : BaseEvent   = new BaseEvent()
    readyEvent  : EventSignal = this._readyEvent.Event

    constructor(name:string,control:CommandAndControl) {
        this.name     = name
        this.safeName = this.name.replace(/\s/g,"-").toLowerCase()
        this.save     = new EZSave<Submission[]>(`${process.cwd}/.data/mds-${this.safeName}.json`)

        this.control  = control
        this.logger   = new Logger(name,SubmissionSystemGroup)
        
        this.fetchChannel().then(() => this._readyEvent.Fire())
    }

    async fetchChannel() {
        this.channel = await this.control.getChannel(this.safeName) 
        return this.channel
    }

    ready() {
        return new Promise<void>((resolve,reject) => {
            if (this.channel) resolve()
            else {
                this.readyEvent.Once(() => {
                    if (this.channel) resolve()
                })
            }
        })
    }
}