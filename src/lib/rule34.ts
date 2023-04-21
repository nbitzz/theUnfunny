import axios from "axios"
import { load } from "cheerio"
import { Logger } from "./logger"

let csle = new Logger("Rule34","Library")

export let searchGet = (tag:string, gelServer = "rule34.xxx"):Promise<{ tag:string, count:number }[]> => {
    return new Promise(async (resolve,reject) => {
        let data = await axios.get(
            `https://${gelServer}/index.php?page=tags&s=list&tags=${encodeURIComponent(tag)}`
        ).catch((err) => {
            csle.error("An error occured while fetching the tags page.")
            reject(err)
        })

        if (!data) return
        
        let $ = load(data.data)
        let arr: { tag: string, count: number }[] = []

        // return array of tags and their post count

        $('table[class=\"highlightable\"] tr').map((x,el) => {
            arr.push({
                tag: $(el.children[1]).text(),
                count: parseInt($(el.children[0]).text(),10)
            })
        })

        resolve(arr)
    })
}

export let fetchPostCountForTag = (tag:string, gelServer?:string):Promise<number> => {
    return new Promise(async (resolve,reject) => {
        let search = await searchGet(tag, gelServer)

        let x = search.find(e => e.tag == tag)
        resolve(x?.count || 0)

    })
}