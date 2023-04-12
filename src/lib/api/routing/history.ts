import { Logger } from "../../logger";
import { Router } from "express";
import Discord from "discord.js";
import { CommandAndControl } from "../../CommandAndControl"
import { SlashCommandManager } from "../../SlashCommandManager"
import { EZSave, getSave } from "../../ezsave";
import { fetchPostCountForTag } from "../../rule34";

let csle = new Logger("history","api")

let save:EZSave<HistoryFrame[]> = getSave(`${process.cwd()}/.data/taghistory.json`)

interface HistoryFrame {
    time  : number
    count : number
}

export function start(client:Discord.Client, control:CommandAndControl, commands:SlashCommandManager, config:{[key:string]:any}) {
    let routes = Router()
    
    routes.get("/:tag", async (req,res) => {
        // kinda just stole this so it's a bit of a mess but whatever
        
        let tag = req.params.tag
        if (tag.split(" ").length > 1) {
            res.status(400)
            res.send("/history/:tag does not support multiple tags")
            return
        } 

        let count = await fetchPostCountForTag(tag)

        let tagHist = (save.data[tag.toLowerCase()] || [])
        let last = tagHist[tagHist.length-1]
        if (!last || last.count != count) {
            tagHist.push({count:count,time:Date.now()})
            save.set_record(tag.toLowerCase(),tagHist)
        }

        res.header("Content-Type","application/json")
        res.send(tagHist)
    })

    return routes
}