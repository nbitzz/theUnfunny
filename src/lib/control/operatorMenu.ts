// this is bad lmao oh well
import { CommandAndControl } from "../CommandAndControl";
import { SelectMenuInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, UserSelectMenuBuilder, APISelectMenuOption } from "discord.js";
import e from "express";

export let operatorMenuDisplay:APISelectMenuOption[] = [
    {
        label:       "Features",
        value:       "features",
        description: "Configure your theUnfunny instance",
        emoji:       {name:"⚙"}
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
        description: "Reset the command & control center",
        emoji:       {name:"❌"}
    }
]

export let operatorMenuOptions:{[key:string]:(int:SelectMenuInteraction,control:CommandAndControl) => Promise<any>} = {
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
    }
}