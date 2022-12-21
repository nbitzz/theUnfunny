import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandUserOption } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";

// init slash command

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("manage")
        .setDescription("Manage the Command & Control Center.")
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("invite")
                .setDescription("Generate an invite")
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("disown")
                .setDescription("Reset the Command & Control Center")
        )
        .addSubcommand(
            new SlashCommandSubcommandBuilder()
                .setName("kick")
                .setDescription("Kick a user")
                .addUserOption(
                    new SlashCommandUserOption()
                        .setName("user")
                        .setDescription("User to kick from the server")
                        .setRequired(true)
                )
        )
)

command.controlCenterOnly = true

command.action = async (interaction,control) => {
    let owner = control.owner

    if (!owner) return

    if (interaction.user.id != owner.id) {
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription("You must be the owner of this instance to use /manage.")
                    .setColor("Red")
            ]
        })
    }

    switch(interaction.options.getSubcommand()) {
        case "disown":
            let rep = await interaction.editReply({
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
            
        break
        case "invite":
            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blurple")
                        .setDescription(`Invite will expire in 15 minutes.\n${await control.makeInvite()}`)
                ]
            })
        break
        case "kick":
            let uTK = interaction.options.getUser("user",true)

            if (uTK.id != interaction.client.user.id && uTK.id != owner.id) {
                // lazy; todo : make this more strict ig
                let memb = await interaction.guild?.members.fetch(uTK.id)

                memb?.kick().then(() => {
                    interaction.editReply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("Red")
                                .setDescription(`User has been removed.`)
                        ]
                    })
                })
            }
        break
    }
}

module.exports = command