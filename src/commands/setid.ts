import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandAttachmentOption, SlashCommandBuilder, SlashCommandNumberOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "discord.js";
import { SlashCommand } from "../lib/SlashCommandManager";
import { ModeratedSubmissionSystem, type Submission } from "../lib/ModeratedSubmissionFramework";
import axios from "axios";
import authenticate_monofile from "../lib/authenticate_monofile";

// init slash commands

let _config = require("../../config.json")

let submissions:ModeratedSubmissionSystem<string>

let command = new SlashCommand(
    new SlashCommandBuilder()
        .setName("setid")
        .setDescription(`Set a meme's file ID; requires monofile 1.3.3+ and an admin account`)
        .addNumberOption(
            new SlashCommandNumberOption()
                .setName("meme-id")
                .setDescription("Meme index")
                .setRequired(true)
        )
        .addStringOption(
            new SlashCommandStringOption()
                .setName("new-id")
                .setDescription("New file ID for this meme")
                .setRequired(true)
        )
)

command.controlCenterOnly = true

command.action = async (interaction, control, share) => {

    if (!submissions) submissions = share.get("memeSubmissionSystem")
    
    await submissions.ready()

    if (!share.get("monofileAuthKey")) {
        await authenticate_monofile(share)
    }

    // test auth
    await (axios.get(`${_config.monofile}/auth/me`, 
        { 
            headers: { 
                "Cookie": `auth=${share.get("monofileAuthKey")};` 
            }
        }
    ).catch(() => authenticate_monofile))
    
    // get meme
    let target = submissions.getSubmissions()[interaction.options.getNumber("meme-id",true)-1]

    if (!target) {
        interaction.editReply("Unknown meme")
    }
    
    // test auth
    let result = await (axios.post(`${_config.monofile}/admin/idchange`,
        {
            target: target.data.split("/")[1],
            new: interaction.options.getString("new-id", true)
        }, 
        { 
            headers: { 
                "Cookie": `auth=${share.get("monofileAuthKey")};` 
            } 
        }
    ).catch((err) => console.error(err)))

    if (!result) {
        interaction.editReply(`An error occured`)
    } else {
        await submissions.editSubmission(target.id, `${target.data.split('/')[0]}/${interaction.options.getString("new-id", true)}`)
        interaction.editReply(`Done!`)
    }

}

// check for monofile before enabling the funny command
if (_config.monofile && _config.monofile_credentials) module.exports = command