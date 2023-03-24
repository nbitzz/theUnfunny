import express from "express";
import fs from "fs/promises";
import { Logger, Groups } from "../logger"
import { CommandAndControl } from "../CommandAndControl"
import { SlashCommandManager } from "../SlashCommandManager"
import Discord from "discord.js"

let app = express();
let csle = new Logger("api","Library")
let group = new Groups.LoggerGroup("api","150,150,255")

export default function start(client:Discord.Client,control:CommandAndControl,commands:SlashCommandManager,config:{[key:string]:any}) {
    csle.info("Starting routes")

    fs.readdir(process.cwd()+"/out/lib/api/routing").then((fn) => {
        fn.forEach((name) => {
            csle.log(`start route ${name.split(".")[0]}`)

            let router = require(process.cwd()+"/out/lib/api/routing/"+name).start(client,control,commands,config)
            app.use(name == "root.ts" ? "" : `/${name.split(".")[0]}`, router)
        })
    })

    app.get("/", async (req,res) => {
        res.send("API ready")
    })
    
    app.listen(config.apiPort || 3000,() => {
        csle.success(`API is listening on port ${config.apiPort || 3000}`)
    })
}