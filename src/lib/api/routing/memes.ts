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
        if (!mss) mss = commands.share.get("memeSubmissionSystem")  as ModeratedSubmissionSystem<string>

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

    routes.get("/geturls", async (req,res) => {
        if (!mss) mss = commands.share.get("memeSubmissionSystem") as ModeratedSubmissionSystem<string>

        if (req.query.type && !["video","image","any"].find(e => e == req.query.type)) { res.sendStatus(400); return }

        await mss.ready()
        let subs = mss.getSubmissions()
        
        res.header("Cache-Control","no-store, must-revalidate")
        res.header("Expires","0")
        res.header("Pragma","no-cache")

        let pg = parseInt(req.query.page?.toString() || "0",10) || 0
        let amt = parseInt(req.query.amount?.toString() ?? "0",10) || 10
        let scL = parseInt(req.query.sexualContent?.toString() || "0",10) || 2
        let isL = parseInt(req.query.insensitivity?.toString() || "0",10) || 2
        let type = req.query.type?.toString() || "any"

        res.send(
            subs
                .filter(e => (e.hazards||{insensitivity:2,sexualContent:2}).sexualContent <= scL && (e.hazards||{insensitivity:2,sexualContent:2}).insensitivity <= isL && e.data.startsWith(type == "any" ? "" : type))
                .slice(pg*amt,pg*amt+amt)
                .map(t => `${config.monofile}/file/${t.data.split("/")[1]}`)
        )
    })

    routes.get("/getdata", async (req,res) => {
        if (!mss) mss = commands.share.get("memeSubmissionSystem") as ModeratedSubmissionSystem<string>

        await mss.ready()
        let subs = mss.getSubmissions()
        
        res.header("Cache-Control","no-store, must-revalidate")
        res.header("Expires","0")
        res.header("Pragma","no-cache")

        let pg = parseInt(req.query.page?.toString() || "0",10) || 0
        let amt = parseInt(req.query.amount?.toString() ?? "0",10) || 10

        res.send(
            subs
                .slice(pg*amt,pg*amt+amt)
        )
    })

    routes.get("/:number", async (req,res) => {
        if (!mss) mss = commands.share.get("memeSubmissionSystem") as ModeratedSubmissionSystem<string>

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

    routes.get("/alt_text/:number", async (req,res) => {
        if (!mss) mss = commands.share.get("memeSubmissionSystem") as ModeratedSubmissionSystem<string>

        await mss.ready()
        let subs = mss.getSubmissions()
        
        let t = subs[(parseInt(req.params.number,10)||0)-1]

        if (!t) {

            res.sendStatus(404)
            return

        }
        
        res.header("Cache-Control","no-store, must-revalidate")
        res.header("Expires","0")
        res.header("Pragma","no-cache")

        res.send(t.altText)
    })

    return routes
}