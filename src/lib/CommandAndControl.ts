// this code is really bad lmao

import { Client, SlashCommandBuilder, Routes, ChatInputCommandInteraction, User, Guild, GuildTextBasedChannel, GuildMember, TextChannel, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonStyle, PermissionsBitField } from "discord.js";
import { EZSave, getSave } from "./ezsave";
import { Logger } from "./logger"
import { BaseEvent, EventSignal } from "./Events"
import { operatorMenuDisplay } from "./control/operatorMenu";

let csle = new Logger("CommandAndControl","Library")

export interface CommandAndControlSettings {
    UGC_STATUSES?: boolean
}

export interface CommandAndControlData {
    guild?    : string
    owner?    : string
    settings? : CommandAndControlSettings
    channels? : { [key:string] : string }
}

export let CommandAndControlDefaults:CommandAndControlSettings = {
    UGC_STATUSES: false
}

export namespace Generators {
    export let operator_menu = async function(control:CommandAndControl) {
        let botOwner = control.owner
        if (!botOwner) return
        
        let menu_channel = (await control.getChannel("operator-menu"))

        await menu_channel.setTopic("Configure your theUnfunny instance")

        await menu_channel.permissionOverwrites.create(menu_channel.guild.roles.everyone,{
            SendMessages:   false,
            ViewChannel : false
        })
        
        await menu_channel.send({
            components: [
                new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .addOptions(
                                ...operatorMenuDisplay
                            )
                            .setCustomId("controlSelMenu")
                    )
            ]
        })

        menu_channel.setPosition(0)
    }
}

export class CommandAndControl {
    readonly client: Client
    readonly save  : EZSave<CommandAndControlData>
    isReady        : boolean = false
    isSetup        : boolean = false

    _readyEvent    : BaseEvent   = new BaseEvent()
    readyEvent     : EventSignal = this._readyEvent.Event
    
    guild?         : Guild
    owner?         : User

    constructor (client:Client) {
        this.client = client;
        this.save = getSave(`${process.cwd()}/.data/commandandcontrol.json`)
        
        this.fetch().then(() => {
            this.isReady = true
            this._readyEvent.Fire()
        })
    }

    ready() {
        return new Promise<void>((resolve,reject) => {
            if (this.isReady) resolve()
            else this.readyEvent.once(() => resolve())
        })
    }

    setup() {
        return new Promise<void>(async (resolve,reject) => {
            if (!this.guild) {
                /* 
                    honestly could probably just use a server template
                    for this but lazy
                */

                csle.info("No guild found. Generating new server...")
                this.guild = await this.client.guilds.create({
                    name:"theUnfunny Command & Control Center",
                    icon:"https://github.com/nbitzz/theUnfunny/raw/main/assets/unfunny/brand/icon.png"
                })

                csle.log("Clearing all channels")
                let chnls = await this.guild.channels.fetch()
                for (let v of chnls.values()) {
                    if (v) await v.delete()
                }

                csle.log("Generating chat channel")
                let sysChannel = await this.guild.channels.create({
                    name:"chat"
                })

                // kill me
                // there has to be a better way to do this

                this.guild.roles.everyone.setPermissions([
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.UseExternalEmojis,
                    PermissionsBitField.Flags.UseExternalStickers,
                    PermissionsBitField.Flags.AddReactions,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.AttachFiles,
                    PermissionsBitField.Flags.ChangeNickname,
                    PermissionsBitField.Flags.CreatePublicThreads,
                    PermissionsBitField.Flags.CreatePrivateThreads,
                    PermissionsBitField.Flags.SendMessagesInThreads,
                    PermissionsBitField.Flags.UseApplicationCommands
                ])

                await this.guild.setSystemChannel(sysChannel)
                this.save.data.data.guild = this.guild.id
                this.save._write()
                csle.success("Successfully generated a new server.")
            }

            let ginvite = await this.makeInvite()
            csle.info(`To continue, please join this server: ${ginvite}`)
            csle.info(`This link will expire in 15 minutes.`)

            let gma = async (member:GuildMember) => {
                if (this.guild && member.guild.id == this.guild.id) {
                    this.owner = member.user
                    this.save.data.data.owner = member.user.id
                    this.save._write()
                    csle.success(`${member.user.tag} is now registered as this instance's owner.`)
                    
                    csle.log("Generating operator menu");
                    await Generators.operator_menu(this)

                    ;(await this.getChannel("operator-menu")).permissionOverwrites.create(this.owner,{
                        SendMessages:   false,
                        ReadMessageHistory: true,
                        ViewChannel : true
                    }).then(() => {
                        csle.success(`Gave owner access to the operator menu.`)
                    })

                    this.client.removeListener("guildMemberAdd",gma)
                    resolve()
                }
            }

            this.client.on("guildMemberAdd",gma)
        })
    }

    makeInvite() {
        return new Promise(async (resolve,reject) => {
            if (this.guild && this.guild.systemChannel) {
                let invite = await this.guild.systemChannel.createInvite({
                    maxUses:1,
                    maxAge:15*60
                })

                resolve(invite.url)
            } else {
                reject("guild/syschannel does not exist")
            }
        })
    }

    private fetch() {
        return new Promise<void>(async (resolve,reject) => {
            // wait for save to be ready
            await this.save.ready()

            if (!this.save.data.data) {
                this.save.set_record("data",{
                    settings: CommandAndControlDefaults
                })
            }

            csle.info("Fetching guild...")

            if (this.save.data.data.guild) {
                let guild = await this.client.guilds.fetch(this.save.data.data.guild).catch((err) => {
                    csle.error("An error occured during guild fetch")
                    console.error(err)
                    process.exit()
                })

                if (!guild) {
                    csle.error("No guild found.")
                } else this.guild = guild
            } else csle.error("No guild was set.")

            csle.info("Fetching owner...")

            if (this.save.data.data.owner) {
                let owner = await this.client.users.fetch(this.save.data.data.owner).catch((err) => {
                    csle.error("An error occured during user fetch")
                    console.error(err)
                    process.exit()
                })

                if (!owner) {
                    csle.error("No owner found.")
                } else this.owner = owner
            } else csle.error("No owner was set.")

            this.isSetup = !!(this.owner && this.guild)

            resolve()
        })
    }

    /**
     * @description Gets a channel. If a channel linked to this name isn't found, a new channel will be created.
     */

    getChannel(channelName:string):Promise<TextChannel> {
        return new Promise(async (resolve,reject) => {
            await this.ready()

            if (!this.save.data.data.channels) {
                this.save.data.data.channels = {}
            }
            
            if (this.guild) {
                let guild = this.guild
                let channel
                if (this.save.data.data) {
                    let cId = (this.save.data.data.channels || {})[channelName]
                    
                    if (cId) {
                        channel = await guild.channels.fetch(cId).catch((err) => {return err})
                    }
                }
                if (channel instanceof Error || !channel) {
                    channel = await guild.channels.create({name:channelName})
                    this.save.data.data.channels[channelName] = channel.id
                    this.save._write().catch((err) => {
                        csle.error("error writing save: getChannel")
                    })
                }
                resolve(channel)
            } else {
                csle.error(`CommandAndControl.guild was not available while trying to fetch ${channelName}.`)
                reject()
            }
        })
    }
}