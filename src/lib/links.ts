import * as linkify from "linkifyjs"

export default function getLinks(str:string) {
    let _links = linkify.find(str).filter(e => e.type == "url" && (e.value.startsWith("https://") || e.value.startsWith("http://")))
    
    let links = _links.map(e => {
        let urlParts = e.value.split("/").slice(2)
        let domain = urlParts.splice(0,1)[0]
        let params = ((urlParts[urlParts.length-1] || "")
        .split("?")[1] || "")
        .split("&")
        .map((e:string) => {return {key:e.split("=")[0],value:decodeURI(e.split("=")[1])}})
        let path = urlParts.join("/")
        
        return {
            domain:domain,
            fullpath:path,
            path:path.split("?")[0],
            params:params,
            url:e.value
        }
    })

    return links
}