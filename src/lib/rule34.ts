import axios from "axios"
import { load } from "cheerio"
import { Logger } from "./logger"

let csle = new Logger("Rule34","Library")

export let fetchPostCountForTag = (tag:string):Promise<number> => {
    return new Promise(async (resolve,reject) => {
        let data = await axios.get(
            `https://rule34.xxx/index.php?page=tags&s=list&tags=${encodeURIComponent(tag)}`
        ).catch((err) => {
            csle.error("An error occured while fetching the tags page.")
            reject(err)
        })

        if (!data) return
        
        let $ = load(data.data)
        let result = 0

        $('table[class=\"highlightable\"] tr').map((x,el) => {
            if ($(el.children[1]).text() == tag) {
                result = parseInt($(el.children[0]).text(),10)
            }
        })
        
        resolve(result)
    })
}