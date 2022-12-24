/*
    Okay, yeah, this code is horrible, 
    but what are you gonna do about it?
*/

import { CommandAndControl } from "../CommandAndControl";
import { StringSelectMenuInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, UserSelectMenuBuilder, APISelectMenuOption, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, resolveColor } from "discord.js";

export let operatorMenuDisplay:APISelectMenuOption[] = [
    {
        label:       "Make an announcement",
        value:       "announce",
        description: "I'd like to make an announcement, Shadow the Hedgehog is a bitch ass motherfucker",
        emoji:       {name:"🔊"}
    },
    {
        label:       "Invite others",
        value:       "invite",
        description: "Create a new 15-minute one-use invite",
        emoji:       {name:"📩"}
    },
    {
        label:       "Remove member",
        value:       "kick",
        description: "Kick a member from the command & control center",
        emoji:       {name:"🔪"}
    },
    {
        label:       "Disown this bot",
        value:       "disown",
        description: "Reset control center (other data will be kept)",
        emoji:       {name:"❌"}
    }
]

export let operatorMenuOptions:{[key:string]:(int:StringSelectMenuInteraction,control:CommandAndControl) => Promise<any>} = {
    invite: async (interaction,control) => {
        await interaction.reply({content:"Please wait...",ephemeral:true})
        await interaction.editReply({
            content:null,
            embeds: [
                new EmbedBuilder()
                    .setColor("Blurple")
                    .setDescription(`Invite will expire in 15 minutes.\n${await control.makeInvite()}`)
            ]
        })
    },
    disown: async (interaction,control) => {
        let rep = await interaction.reply({
            ephemeral:true,
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Are you sure?")
                    .setDescription(
                        "Disowning your theUnfunny instance will allow you to assign a new owner. "
                        + "The current Command & Control center will be deleted and "
                        + "the Node.js process will exit."    
                    )
            ],
            components:[
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId("noDisown")
                            .setLabel("No thanks, I would not like to disown this instance")
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId("disown")
                            .setLabel("Yes, disown this instance")
                            .setStyle(ButtonStyle.Danger)
                    )
            ]
        })

        let coll = rep.createMessageComponentCollector({
            time:30000,
            componentType: ComponentType.Button
        })

        coll.on("collect", (int) => {
            if (int.customId == "disown") {
                control.guild?.delete().then(() => {
                    control.save.delete_record("data")
                    process.exit()
                })
            } else {
                interaction.deleteReply()
            }
        })
    },
    kick: async (interaction,control) => {
        if (!control.owner) return
        let owner = control.owner
        

        let rep = await interaction.reply({
            ephemeral:true,
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setDescription("Select a user.")
            ],
            components:[
                new ActionRowBuilder<UserSelectMenuBuilder>()
                    .addComponents(
                        new UserSelectMenuBuilder()
                            .setCustomId("userToKick")
                            .setPlaceholder("Select a user to kick...")
                    )
            ]
        })

        let coll = rep.createMessageComponentCollector({
            time:30000,
            componentType: ComponentType.UserSelect,
            filter:(a) => owner.id == a.user.id
        })

        let answered = false

        coll.on("collect", async (int) => {
            answered = true

            let disallowed = [owner.id,interaction.client.user.id]

            if (disallowed.find(e => e == int.values[0])) {
                int.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setDescription("You cannot kick yourself or theUnfunny.")
                    ]
                ,components:[]})

                return
            }

            if (!control.guild) return
            let memb = await control.guild.members.fetch(int.values[0]).catch(err => {console.error(err)})
            if (!memb) return
            
            await memb.kick()

            int.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blurple")
                        .setDescription("User has been removed.")
                ],
                components:[]
            })
        })

        coll.on("end", () => {
            if (!answered) {
                interaction.editReply({embeds:[
                    new EmbedBuilder()
                        .setColor("Red")
                        .setDescription("Prompt ended.")
                ],components:[]})
            }
        })
    },
    announce: async (interaction,control) => {
        if (!control.owner) return
        let owner = control.owner
         

        interaction.showModal(
            new ModalBuilder()
                .setTitle("Announcement")
                .setCustomId("annmodal")
                .addComponents(
                    new ActionRowBuilder<TextInputBuilder>()
                        .addComponents(
                            new TextInputBuilder()
                               .setLabel("Title")
                                .setStyle(TextInputStyle.Short)
                                .setMaxLength(100)
                                .setRequired(true)
                                .setPlaceholder("I've come to make an announcement")
                                .setCustomId("title")
                        ),
                    new ActionRowBuilder<TextInputBuilder>()
                        .addComponents(
                            new TextInputBuilder()
                                .setLabel("Content")
                                .setStyle(TextInputStyle.Paragraph)
                                .setMaxLength(2000)
                                .setRequired(true)
                                .setPlaceholder("Shadow the Hedgehog is a bitch ass motherfucker")
                                .setCustomId("content")
                        )
                )
        )

        interaction.awaitModalSubmit({
            time:5*60*60*1000
        }).then(async (submission) => {
            let announcementTitle = submission.fields.getField("title",ComponentType.TextInput).value
            let announcementContent = submission.fields.getField("content",ComponentType.TextInput).value

            let AnnouncementEmbed = new EmbedBuilder()
                                        .setTitle(announcementTitle)
                                        .setDescription(announcementContent)
                                        .setColor("Blurple")
                                        .setFooter({text:"This is a global announcement from the owner of this theUnfunny instance. It is being sent to this channel as it is the system channel."})
                                        .setAuthor({name:interaction.user.tag,iconURL:interaction.user.avatarURL() || undefined})

            let repl = await submission.reply({
                ephemeral:true,
                embeds: [
                    {description:"Here's what your announcement will look like:",color:resolveColor("Green")},
                    AnnouncementEmbed,
                    {description:"Would you like to send it?",color:resolveColor("Green")}
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel("Send announcement")
                                .setStyle(ButtonStyle.Success)
                                .setCustomId("yes"),
                            new ButtonBuilder()
                                .setLabel("Do not send")
                                .setStyle(ButtonStyle.Danger)
                                .setCustomId("no")
                        )
                ]
            })

            let coll = repl.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time:30000
            })

            let answered = false
            
            coll.on("collect", async (int) => {
                answered = int.customId == "yes";
                coll.stop();
                
                if (!answered) {int.deferUpdate(); return}

                int.update({
                    components:[],
                    embeds:[],
                    content:"Your message is now being sent to servers. Please wait."
                })
                let guilds = await interaction.client.guilds.fetch()

                guilds.forEach((v) => {
                    v.fetch().then((guild) => {
                        if (guild.systemChannel && guild.members.me) {
                            let perms = guild.members.me.permissionsIn(guild.systemChannel)

                            if (perms.has(PermissionFlagsBits.SendMessages) && perms.has(PermissionFlagsBits.ViewChannel)) {
                                guild.systemChannel.send({
                                    embeds: [AnnouncementEmbed]
                                }).catch((err) => {console.error(err)})
                            }
                        }
                    })
                })
            })

            coll.on("end",() => {if (!answered) submission.editReply({components:[],embeds:[],content:"Prompt cancelled."}) })
        })
        
        
    }
}