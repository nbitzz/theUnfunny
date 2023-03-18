/*
    could probably use ezsave for this

    2022-12-26: maybe i should just give up
*/

import { Logger, Groups, use } from "./logger";
import { CommandAndControl } from "./CommandAndControl";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild, TextChannel, User } from "discord.js";
import { BaseEvent, EventSignal } from "./Events";
import { EZSave, getSave } from "./ezsave";

export const SubmissionSystemGroup = new Groups.LoggerGroup("ModeratedSubmissionSystem","69,69,69")
export const csle                  = new Logger("ModeratedSubmissionFramework","Library")
export let   MSSData               = new EZSave<SubmissionSystem<any>>(`${process.cwd()}/.data/submissions.json`)

export let   Systems:Map<string,ModeratedSubmissionSystem<any>> = new Map()

export interface Submission<datatype> {
    author     : string
    moderated  : boolean
    message    : string
    id         : string
    data       : datatype,
    favorites? : string[]
} 

export interface SubmissionSystem<datatype> {
    submissions  : Submission<datatype>[],
    favorites    : {[key:string]:string[]}
}

export class ModeratedSubmissionSystem<datatype> {
    name        : string
    safeName    : string

    control     : CommandAndControl
    logger      : Logger
    channel?    : TextChannel
    embedPrc    : (emb:EmbedBuilder,data:datatype) => EmbedBuilder

    data        : SubmissionSystem<datatype> = {submissions:[], favorites: {}}

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

            if (!this.data.favorites) {
                this.data.favorites = {}
            }

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
            if (val.favorites) {
                for (let v of val.favorites) {
                    this._remove_favorite(id,v)
                }
            }

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

    private async _add_favorite(id:string, user:string) {
        await this.ready()

        let val = this.data.submissions.find(e => e.id == id)
        if (!val) return
        if (!val.favorites) val.favorites = [];
        if (!this.data.favorites[user]) this.data.favorites[user] = [];

        val.favorites.push(user)
        this.data.favorites[user].push(id)
    }
    
    private async _remove_favorite(id:string, user:string, favSplice:boolean=true) {
        await this.ready()
        
        let val = this.data.submissions.find(e => e.id == id)
        if (!val) return
        if (!val.favorites) val.favorites = [];
        if (!this.data.favorites[user]) this.data.favorites[user] = [];

        val.favorites.splice(val.favorites.findIndex(e => e == user),1)
        if (favSplice) this.data.favorites[user].splice(this.data.favorites[user].findIndex(e => e == id),1)
    }

    async userFavorites(user:string) {
        await this.ready()
        return this.data.favorites[user] || []
    }

    async favorite(id:string, user:string) {
        await this.ready()

        if (!(await this.userFavorites(user)).find(e => e == id)) await this._add_favorite(id,user)
        else await this._remove_favorite(id,user)
        
        MSSData.set_record(this.name,this.data)
    }
}