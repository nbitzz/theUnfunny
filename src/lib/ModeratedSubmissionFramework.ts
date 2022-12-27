/*
    could probably use ezsave for this

    2022-12-26: maybe i should just give up
*/

import { Logger, Groups } from "./logger";
import { CommandAndControl } from "./CommandAndControl";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild, TextChannel, User } from "discord.js";
import { BaseEvent, EventSignal } from "./Events";
import { EZSave, getSave } from "./ezsave";

export const SubmissionSystemGroup = new Groups.LoggerGroup("ModeratedSubmissionSystem","69,69,69")
export const csle                  = new Logger("ModeratedSubmissionFramework","Library")
export let   MSSData               = new EZSave<SubmissionSystem<any>>(`${process.cwd()}/.data/submissions.json`)

export let   Systems:Map<string,ModeratedSubmissionSystem<any>> = new Map()

export interface Submission<datatype> {
    author    : string
    moderated : boolean
    message   : string
    id        : string
    data      : datatype
} 

export interface SubmissionSystem<datatype> {
    submissions : Submission<datatype>[]
}

export class ModeratedSubmissionSystem<datatype> {
    name        : string
    safeName    : string

    control     : CommandAndControl
    logger      : Logger
    channel?    : TextChannel
    embedPrc    : (emb:EmbedBuilder,data:datatype) => EmbedBuilder

    data        : SubmissionSystem<datatype> = {submissions:[]}

    _readyEvent : BaseEvent   = new BaseEvent()
    readyEvent  : EventSignal = this._readyEvent.Event

    constructor(name:string,control:CommandAndControl,embedProcessor:(emb:EmbedBuilder,data:datatype) => EmbedBuilder) {
        this.name     = name
        this.safeName = this.name.toLowerCase().replace(/[^a-z]/g,"-")
        this.embedPrc = embedProcessor

        this.control  = control
        this.logger   = new Logger(name,SubmissionSystemGroup)
        
        MSSData.ready().then(() => {
            this.data = MSSData.data[this.name] || this.data
            this.fetchChannel().then(() => this._readyEvent.Fire())
        })
    }

    async fetchChannel() {
        this.channel = await this.control.getChannel(this.safeName)
        Systems.set(this.channel.id,this)
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

    async submit(user:User,data:datatype) {
        await this.ready();
        if (!this.channel) return

        let emb = this.embedPrc(new EmbedBuilder()
            .setColor("Blurple")
            .setAuthor({name:user.tag,iconURL:user.avatarURL() || undefined})
            .setTitle(`Submission (${new Date().toUTCString()})`)
        ,data)

        let submissionid = Math.random().toString().slice(2)

        let msg = await this.channel.send({
            embeds:[emb],
            components:[
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`sub:approve:${submissionid}`)
                            .setStyle(ButtonStyle.Success)
                            .setLabel("Approve"),
                        new ButtonBuilder()
                            .setCustomId(`sub:delete:${submissionid}`)
                            .setStyle(ButtonStyle.Danger)
                            .setLabel("Block")
                    )
            ]
        })

        this.data.submissions.push({
            author:user.id,
            message:msg.id,
            moderated:false,
            data:data,
            id:submissionid
        })
        MSSData.set_record(this.name,this.data)
    }

    getSubmissions() {
        return this.data.submissions.filter(e => e.moderated)
    }

    async deleteSubmission(id:string) {
        await this.ready()
        if (!this.channel) return

        let idx = this.data.submissions.findIndex(e => e.id == id)
        let val = this.data.submissions.find(e => e.id == id)
        
        if (val && idx != -1) {
            let msg = await this.channel.messages.fetch(val.message).catch(() => null)
            if (msg) msg.delete()
            this.data.submissions.splice(idx,1)
            MSSData.set_record(this.name,this.data)
        }
    }

    async acceptSubmission(id:string) {
        await this.ready()
        if (!this.channel) return

        let val = this.data.submissions.find(e => e.id == id)
        
        if (val) {
            val.moderated = true
            MSSData.set_record(this.name,this.data)
            let msg = await this.channel.messages.fetch(val.message).catch(() => null)
            if (msg) {
                msg.edit({
                    components:[
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId("___")
                                    .setDisabled(true)
                                    .setStyle(ButtonStyle.Success)
                                    .setLabel("Submission approved"),
                                new ButtonBuilder()
                                    .setCustomId(`sub:delete:${id}`)
                                    .setStyle(ButtonStyle.Danger)
                                    .setLabel("Delete submission")
                            )
                    ]
                })
            }
        }
    }
}