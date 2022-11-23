// This code really sucks.

import axios from "axios"
import fs from "fs/promises"
import {load} from "cheerio"

export async function getCSRF(token:string) {
    // do something useless
    return axios.post("https://auth.roblox.com/v2/logout",undefined,{
        headers: {
            Cookie: `.ROBLOSECURITY=${token};`
        }
    }).catch((dat) => {
        if (dat.response.headers["x-csrf-token"]) return dat.response.headers["x-csrf-token"];
        else throw new Error('Could not get CSRF!');
    })
}

export async function getUserId(token:string):Promise<string> {
    return (await axios.get("https://www.roblox.com/my/account/json",{headers:{
        Cookie: `.ROBLOSECURITY=${token}`
    }})).data.UserId
}

export let readPromise = fs.readFile

export async function getVerificationToken(url:string,token:string):Promise<{input?:string,header?:string[]}> {
    let wp = await axios.get(url,{
        headers:{
            Cookie: `.ROBLOSECURITY=${token}`,
            "X-CSRF-Token":await getCSRF(token),
        },
        responseType:"text"
    })

    let v = load(wp.data)('input[name=__RequestVerificationToken]').val()

    return {input:Array.isArray(v) ? v[0] : v,header:Array.from((wp.headers["set-cookie"]||"").toString().match(/__RequestVerificationToken=(.*?);/)||[])}
}