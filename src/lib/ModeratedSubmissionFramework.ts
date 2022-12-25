/*
    could probably use ezsave for this
*/

import { Logger, Groups } from "./logger";
import { CommandAndControl } from "./CommandAndControl";
import { TextChannel } from "discord.js";
import { BaseEvent, EventSignal } from "./Events";

export enum SubmissionType {
    Text,
    Image
}

export const SubmissionSystemGroup = new Groups.LoggerGroup("ModeratedSubmissionSystem","69,69,69")

export class ModeratedSubmissionSystem {
    name        : string

    control     : CommandAndControl
    logger      : Logger
    channel?    : TextChannel

    _readyEvent : BaseEvent   = new BaseEvent()
    readyEvent  : EventSignal = this._readyEvent.Event

    type        : SubmissionType

    constructor(name:string,control:CommandAndControl,type:SubmissionType) {
        this.name    = name
        this.type    = type

        this.control = control
        this.logger  = new Logger(name,SubmissionSystemGroup)
    }

    async fetchChannel() {
        this.channel = await this.control.getChannel(this.name.replace(/\s/g,"-")) 
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

    async submit(data:string) {
        await this.ready()
        if (!this.channel) return
        
        let channel = this.channel
        
        
    }
}