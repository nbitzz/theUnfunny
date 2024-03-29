import { EmbedBuilder, Message, User } from "discord.js";
import { BaseChannelManager } from "../lib/managers";
import * as linkify from "linkifyjs"
import axios from "axios"
import { ModeratedSubmissionSystem } from "../lib/ModeratedSubmissionFramework";
import { CommandAndControl } from "../lib/CommandAndControl";
import { SlashCommandManager } from "../lib/SlashCommandManager";
import authenticate_monofile from "../lib/authenticate_monofile"

let _config = require("../../config.json")

class MemeChannelManager extends BaseChannelManager {
    
    name = "MemeChannelManager"

    async submit(url:string, user: User, tries: number=0) {
        // todo: move this to authenticate_monofile.ts?
        if (_config.monofile_credentials) {
            if (!this.commands.share.get("monofileAuthKey")) {
                console.log(`Logging in as ${_config.monofile_credentials.username}...`)
                await authenticate_monofile(this.commands.share)
            }
    
            // test auth
            await (axios.get(`${_config.monofile}/auth/me`, 
                { 
                    headers: { 
                        "Cookie": `auth=${this.commands.share.get("monofileAuthKey")};` 
                    }
                }
            ).catch(async () => {
                console.log(`Logging in as ${_config.monofile_credentials.username}...`); 
                return authenticate_monofile(this.commands.share)
            }))
        }

        let mss:ModeratedSubmissionSystem<string> = this.commands.share.get("memeSubmissionSystem")
        if (!mss) return

        return new Promise<void>(async (resolve,reject) => {
            axios.post(
                `${_config.monofile}/clone`,
                JSON.stringify({
                    url,
                    uploadId:url.endsWith(".gif") ? Math.random().toString().slice(2)+".gif" : undefined
                }),
                {
                    headers: {
                        "Content-Type":"text/plain",
                        ...(
                            this.commands.share.has("monofileAuthKey") 
                            ? {"Cookie": `auth=${this.commands.share.get("monofileAuthKey")};`} 
                            : {}
                        )
                    }
                }
            ).then(async (data) => {
                let d = await axios.get(`${_config.monofile}/file/${data.data}`,{responseType:"arraybuffer"})
        
                if (
                    !(d.headers["content-type"] 
                    && (d.headers["content-type"].startsWith("video/") 
                    || d.headers["content-type"].startsWith("image/")))
                    ) {reject("Invalid file type"); return}
        
                if (d.data.byteLength >= 75*1024*1024) { reject("File too large"); return }
        
                await mss.submit(user ,`${d.headers["content-type"]?.split("/")[0]}/${data.data}`)
            
                resolve()
            }).catch(async (err) => {
                console.error(err)

                if ((tries||0) >= 3) {reject("Failed to submit file");return}
                resolve(this.submit(url, user, (tries||0)+1))
            })
        })
    }

    async recieve(message: Message) {

        if (message.author.bot) return
        
        let lnk = []
        
        lnk.push(
            ...linkify.find(message.content).map(v => v.value),
            ...message.attachments.map((v) => v.proxyURL)
        )

        if (lnk.length == 0) return

        if (lnk.length > 10) {
            
            message.reply(
                {
                    embeds: [
                        new EmbedBuilder()
                            .setColor("Red")
                            .setDescription(`Please attach less than 10 files per bulk submission.`)
                    ]
                }
            )

            return
            
        }

        let repl = await message.reply(
            {
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blurple")
                        .setDescription(`Hold on...`)
                ]
            }
        )

        // try uploading each

        let states:{fail:boolean,message:string}[] = []

        for (let v of lnk) {
            
            let state = await this.submit(v,message.author)?.catch((err) => { return {fail:true, message:err} })
            
            states.push(state || {fail:false, message: "submitted"})

            await repl.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Blurple")
                        .setDescription(states.map((value,key) => `\`\`#${key+1}\`\` ${value.fail ? "⚠️" : "📤"} ${value.message}`).join("\n"))
                ]
            })
        }

    }

}

let manager: MemeChannelManager

export function get(control:CommandAndControl, command:SlashCommandManager):MemeChannelManager {
    if (!manager) manager = new MemeChannelManager(control,command)
    return manager
}