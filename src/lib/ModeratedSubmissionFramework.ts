/*
    could probably use ezsave for this

    2022-12-26: maybe i should just give up
*/

import { Logger, Groups, use } from "./logger";
import { CommandAndControl } from "./CommandAndControl";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild, MessagePayload, ModalBuilder, ModalSubmitInteraction, TextChannel, User } from "discord.js";
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
    favorites? : string[],
    altText?   : string,
    replyId?   : string,

    hazards?   : {
        insensitivity: 0 | 1 | 2,
        sexualContent: 0 | 1 | 2
    }
} 

export interface SubmissionSystem<datatype> {
    submissions  : Submission<datatype>[],
    favorites    : {[key:string]:string[]}
}

export interface InternalSubmitOptions {
    embed: EmbedBuilder, 
    reply?: string
}

export class ModeratedSubmissionSystem<datatype> {
    name        : string
    safeName    : string

    control     : CommandAndControl
    logger      : Logger
    channel?    : TextChannel
    embedPrc    : (emb:EmbedBuilder,data:datatype) => EmbedBuilder | InternalSubmitOptions

    data        : SubmissionSystem<datatype> = {submissions:[], favorites: {}}

    _readyEvent : BaseEvent   = new BaseEvent()
    readyEvent  : EventSignal = this._readyEvent.Event

    takeDescriptions: boolean = false
    enableEditing: boolean = false
    enableContentRatings: boolean = false
    
    getEditModal?: (submission:Submission<datatype>) => ModalBuilder
    modalHandler?: (data:datatype,int:ModalSubmitInteraction) => datatype

    constructor(name:string,control:CommandAndControl,embedProcessor:(emb:EmbedBuilder,data:datatype) => EmbedBuilder | InternalSubmitOptions, descriptionsEnabled:boolean = false, contentRatingsEnabled: boolean = false) {
        this.name     = name
        this.safeName = this.name.toLowerCase().replace(/[^a-z]/g,"-")
        this.embedPrc = embedProcessor

        this.control  = control
        this.logger   = new Logger(name,SubmissionSystemGroup)
        
        this.takeDescriptions = descriptionsEnabled
        this.enableContentRatings = contentRatingsEnabled

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

        let mCmbo = this.embedPrc(new EmbedBuilder()
            .setColor("Blurple")
            .setAuthor({name:user.tag,iconURL:user.avatarURL() || undefined})
            .setTitle(`Submission (${new Date().toUTCString()})`)
        ,data)

        let emb = mCmbo instanceof EmbedBuilder ? mCmbo : mCmbo.embed

        let submissionid = Math.random().toString().slice(2)

        
        if (!this.channel) return

        let msg = await this.channel.send({
            embeds:[emb],
            components:[
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`sub:approve:${submissionid}`)
                            .setStyle(ButtonStyle.Success)
                            .setLabel("Approve"),
                        ...(this.enableEditing ? [
                            new ButtonBuilder()
                                .setCustomId(`sub:edit:${submissionid}`)
                                .setStyle(ButtonStyle.Secondary)
                                .setLabel("Edit")
                        ] : []),
                        new ButtonBuilder()
                            .setCustomId(`sub:delete:${submissionid}`)
                            .setStyle(ButtonStyle.Danger)
                            .setLabel("Block")
                    )
            ]
        })

        let reply

        if (!(mCmbo instanceof EmbedBuilder) && mCmbo.reply) {
            reply = await msg.reply(mCmbo.reply)
        }

        this.data.submissions.push({
            author:user.id,
            message:msg.id,
            moderated:false,
            data:data,
            id:submissionid,
            replyId: reply?.id
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
            if (val.replyId) {
                let reply = await this.channel.messages.fetch(val.replyId).catch(() => null)
                if (reply) reply.delete()
            }
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
                                ...(this.enableEditing ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:edit:${id}`)
                                        .setStyle(ButtonStyle.Secondary)
                                        .setLabel("Edit")
                                ] : []),
                                ...(this.enableContentRatings ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:hazard:${id}`)
                                        .setStyle(val.hazards ? ButtonStyle.Success : ButtonStyle.Secondary)
                                        .setLabel(val.hazards ? `${["SFW", "Suggestive", "H. Suggestive"][val.hazards.sexualContent]}; ${["Clean","Insensitive", "Slurs"][val.hazards.insensitivity]}` : "Set hazards")
                                ] : []),
                                new ButtonBuilder()
                                    .setCustomId(`sub:delete:${id}`)
                                    .setStyle(ButtonStyle.Danger)
                                    .setLabel("Delete submission"),
                                ...(this.takeDescriptions ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:addAltText:${id}`)
                                        .setStyle(val.altText ? ButtonStyle.Success : ButtonStyle.Secondary)
                                        .setLabel(val.altText ? "Edit alt text" : "Add alt text")
                                ] : [])
                            )
                    ]
                })
            }
        }
    }

    async editSubmission(id:string, data:datatype) {
        await this.ready()
        if (!this.channel) return
        //if (!this.enableEditing) return

        let val = this.data.submissions.find(e => e.id == id)
        
        if (val) {
            val.data = data
            let msg = await this.channel.messages.fetch(val.message).catch(() => null)
            if (msg) {
                let mCmbo = this.embedPrc(new EmbedBuilder()
                    .setColor("Blurple")
                    .setAuthor(msg.embeds[0].author)
                    .setTitle(msg.embeds[0].title)
                ,data)

                let emb = mCmbo instanceof EmbedBuilder ? mCmbo : mCmbo.embed

                msg.edit({
                    embeds:[emb]
                })

                if (val.replyId) {
                    let reply = await this.channel.messages.fetch(val.replyId).catch(() => null)
                    if (reply) reply.edit(mCmbo instanceof EmbedBuilder ? "[No reply]" : mCmbo.reply || "[No reply]")
                } else if (!(mCmbo instanceof EmbedBuilder) && mCmbo.reply) {
                    let reply = await msg.reply(mCmbo.reply)
                    val.replyId = reply.id
                }
            }
            MSSData.set_record(this.name,this.data)
        }
    }

    // todo: DRY this up

    async setAltText(id:string, text: string) {
        await this.ready()
        if (!this.channel) return

        let val = this.data.submissions.find(e => e.id == id)
        
        if (val) {
            val.altText = text
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
                                ...(this.enableEditing ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:edit:${id}`)
                                        .setStyle(ButtonStyle.Secondary)
                                        .setLabel("Edit")
                                ] : []),
                                ...(this.enableContentRatings ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:hazard:${id}`)
                                        .setStyle(val.hazards ? ButtonStyle.Success : ButtonStyle.Secondary)
                                        .setLabel(val.hazards ? `${["SFW", "Suggestive", "H. Suggestive"][val.hazards.sexualContent]}; ${["Clean","Insensitive", "Slurs"][val.hazards.insensitivity]}` : "Set hazards")
                                ] : []),
                                new ButtonBuilder()
                                    .setCustomId(`sub:delete:${id}`)
                                    .setStyle(ButtonStyle.Danger)
                                    .setLabel("Delete submission"),
                                ...(this.takeDescriptions ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:addAltText:${id}`)
                                        .setStyle(val.altText ? ButtonStyle.Success : ButtonStyle.Secondary)
                                        .setLabel(val.altText ? "Edit alt text" : "Add alt text")
                                ] : [])
                            )
                    ]
                })
            }
        }
    }

    async setHazards(id:string, insensitivity: 0 | 1 | 2, sexualContent: 0 | 1 | 2) {
        await this.ready()
        if (!this.channel) return

        let val = this.data.submissions.find(e => e.id == id)
        
        if (val) {
            val.hazards = {
                insensitivity,
                sexualContent
            }

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
                                ...(this.enableEditing ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:edit:${id}`)
                                        .setStyle(ButtonStyle.Secondary)
                                        .setLabel("Edit")
                                ] : []),
                                ...(this.enableContentRatings ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:hazard:${id}`)
                                        .setStyle(val.hazards ? ButtonStyle.Success : ButtonStyle.Secondary)
                                        .setLabel(val.hazards ? `${["SFW", "Suggestive", "H. Suggestive"][val.hazards.sexualContent]}; ${["Clean","Insensitive", "Slurs"][val.hazards.insensitivity]}` : "Set hazards")
                                ] : []),
                                new ButtonBuilder()
                                    .setCustomId(`sub:delete:${id}`)
                                    .setStyle(ButtonStyle.Danger)
                                    .setLabel("Delete submission"),
                                ...(this.takeDescriptions ? [
                                    new ButtonBuilder()
                                        .setCustomId(`sub:addAltText:${id}`)
                                        .setStyle(val.altText ? ButtonStyle.Success : ButtonStyle.Secondary)
                                        .setLabel(val.altText ? "Edit alt text" : "Add alt text")
                                ] : [])
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