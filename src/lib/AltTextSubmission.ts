import { EmbedBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ModalSubmitInteraction } from "discord.js";
import { CommandAndControl } from "./CommandAndControl";
import { ModeratedSubmissionSystem, MSSData, Submission } from "./ModeratedSubmissionFramework";

export class AltTextSuggestions extends ModeratedSubmissionSystem<{ text: string, submissionid: string }> {
    
    targetSubmissionSystem: ModeratedSubmissionSystem<any>
    enableEditing = true;

    constructor(control: CommandAndControl, targetSubmissionSystem: ModeratedSubmissionSystem<any>) {
        
        super(targetSubmissionSystem.name+"-ats", control, (emb: EmbedBuilder, data) => {
            emb.setDescription(data.text)

            let fdd = targetSubmissionSystem.data.submissions.find(e => e.id == data.submissionid)

            if (!fdd) {
                return emb.setDescription("[Submission not found]").setColor("Red")
            }
            
            emb.addFields({name: "Submission", value:`https://discord.com/channels/${control.guild?.id}/${targetSubmissionSystem.channel?.id}/${fdd.id}`})

            return emb
        },false)

        this.targetSubmissionSystem = targetSubmissionSystem

    }

    async acceptSubmission(id:string) {
        await this.ready()
        if (!this.channel) return

        let val = this.data.submissions.find(e => e.id == id)
        
        if (val) {
            this.targetSubmissionSystem.setAltText(val.data.submissionid, val.data.text)
            this.deleteSubmission(val.id)
        }
    }

    getEditModal = (submission: Submission<{ text: string, submissionid: string }>) => {
        return new ModalBuilder()
            .setTitle("Edit submission")
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>()
                    .addComponents(
                        new TextInputBuilder()
                            .setRequired(true)
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder("Transcribe text and audio & describe contents in extreme detail")
                            .setCustomId("text")
                            .setMaxLength(2048)
                            .setLabel("Alt text")
                            .setValue(submission.data.text)
                    )
            )
    }

    modalHandler = (data: {text:string, submissionid:string}, int:ModalSubmitInteraction) => {
        return {text: int.fields.getTextInputValue("text"), submissionid: data.submissionid}
    } 

}