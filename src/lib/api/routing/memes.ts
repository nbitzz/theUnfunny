import { Logger } from "../../logger";
import { Router } from "express";
import Discord from "discord.js";
import { CommandAndControl } from "../../CommandAndControl"
import { SlashCommandManager } from "../../SlashCommandManager"
import { ModeratedSubmissionSystem } from "../../ModeratedSubmissionFramework"

let csle = new Logger("memes","api")

export function start(client:Discord.Client, control:CommandAndControl, commands:SlashCommandManager, config:{[key:string]:any}) {
    let routes = Router()
    let mss:ModeratedSubmissionSystem<string> = commands.share.get("memeSubmissionSystem")

    routes.get("/random/:type", async (req,res) => {
        if (!mss) mss = commands.share.get("memeSubmissionSystem")

        if (!["video","image","any"].find(e => e == req.params.type)) { res.sendStatus(400); return }

        await mss.ready()
        let subs = mss.getSubmissions().map((v) => v.data).filter((e) => e.startsWith(req.params.type == "any" ? "" : req.params.type))
        if (subs.length == 0) {res.sendStatus(404); return}
        
        let t = subs[Math.floor(Math.random()*subs.length)]
        
        res.header("Cache-Control","no-store, must-revalidate")
        res.header("Expires","0")
        res.header("Pragma","no-cache")

        if (req.query.urlOnly == "1") res.send(`${config.monofile}/file/${t.split("/")[1]}`)
        else res.redirect(`${config.monofile}/file/${t.split("/")[1]}`)
    })

    routes.get("/:number", async (req,res) => {
        if (!mss) mss = commands.share.get("memeSubmissionSystem")

        await mss.ready()
        let subs = mss.getSubmissions().map((v) => v.data)
        
        let t = subs[(parseInt(req.params.number,10)||0)-1]

        if (!t) {

            res.sendStatus(404)
            return

        }
        
        res.header("Cache-Control","no-store, must-revalidate")
        res.header("Expires","0")
        res.header("Pragma","no-cache")

        if (req.query.urlOnly == "1") res.send(`${config.monofile}/file/${t.split("/")[1]}`)
        else res.redirect(`${config.monofile}/file/${t.split("/")[1]}`)
    })

    return routes
}