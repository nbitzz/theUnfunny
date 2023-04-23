import { EmbedBuilder } from "discord.js";
import { CommandAndControl } from "./CommandAndControl";
import { ModeratedSubmissionSystem, MSSData } from "./ModeratedSubmissionFramework";

export class AltTextSuggestions extends ModeratedSubmissionSystem<{ text: string, submissionid: string }> {
    
    targetSubmissionSystem: ModeratedSubmissionSystem<any>

    constructor(control: CommandAndControl, targetSubmissionSystem: ModeratedSubmissionSystem<any>) {
        
        super(targetSubmissionSystem.name+"-ats", control, (emb: EmbedBuilder, data) => {
            emb.setDescription(data.text)

            let fdd = targetSubmissionSystem.data.submissions.find(e => e.id == data.submissionid)

            if (!fdd) {
                return emb.setDescription("[Submission not found]").setColor("Red")
            }
            
            emb.addFields({name: "Submission", value:`[https://discord.com/channels/${control.guild?.id}/${targetSubmissionSystem.channel?.id}/${fdd.id}](view)`})

            return emb
        },false)

        this.targetSubmissionSystem = targetSubmissionSystem

    }

    async acceptSubmission(id:string) {
        await this.ready()
        if (!this.channel) return

        let val = this.data.submissions.find(e => e.id == id)
        
        if (val) {
            val.moderated = true
            MSSData.set_record(this.name,this.data)
            let msg = await this.channel.messages.fetch(val.message).catch(() => null)
            
            if (msg) msg.delete()
        }
    }

}