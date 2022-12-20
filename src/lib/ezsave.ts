import fs from "fs/promises"
import { existsSync, mkdirSync } from "fs"
import { Logger } from "./logger"

let csle = new Logger("EZSave","Library")

export interface Metadata {
    expire:number
}

export class EZSave<datatype> {
    readonly filepath:string
    data:{[key:string]:datatype} = {}
    metadata:{[key:string]:Metadata} = {}

    expire:Map<string,NodeJS.Timeout> = new Map()

    constructor(filepath:string) {
        this.filepath = filepath
        this._read()
    }

    _read() {
        return fs.readFile(this.filepath).then((data) => {
            let dt = JSON.parse(data.toString())
            this.data = dt.data
            this.metadata = dt.meta
        }).catch((err) => {
            csle.error(`Failed to read file: ${this.filepath}`)
            console.error(err)
        }).finally(() => {
            this.expire.forEach((v,x) => {
                clearTimeout(v)
                this.expire.delete(x)
            })
            for (let [key] of Object.entries(this.metadata)) {
                this.refresh_expiration(key)
            }
        })
    }
    
    _write() {
        // i'm lazy lmao
        if (!existsSync(process.cwd()+"/.data")) {
            mkdirSync(process.cwd()+"/.data")
        }

        return fs.writeFile(this.filepath,JSON.stringify({data:this.data,meta:this.metadata}), { flag: 'w' })
    }

    refresh_expiration(record_name:string) {
        let dt = this.expire.get(record_name)
        if (dt) {
            clearTimeout(dt)
        }

        if (this.metadata[record_name]) {
            this.expire.set(record_name,setTimeout(() => {
                this.delete_record(record_name)
            },this.metadata[record_name].expire-Date.now()))
        }
    }

    set_record(record_name:string,record_data:datatype,expire?:number) {
        this.data[record_name] = record_data
        if (expire) this.metadata[record_name] = {expire:expire}
        else delete this.metadata[record_name]
        this.refresh_expiration(record_name)
        this._write().catch((err) => {
            csle.error(`set_record failed: ${record_name} on ${this.filepath}`)
            console.error(err)
        })
    }

    delete_record(record_name:string) {
        delete   this.data[record_name]
        delete   this.metadata[record_name]
        let dt = this.expire.get(record_name)
        if (dt) {
            clearTimeout(dt)
        }
        this._write().catch((err) => {
            csle.error(`delete_record failed: ${record_name} on ${this.filepath}`)
            console.error(err)
        })
    }

}

let activeSaves:Map<string,EZSave<any>> = new Map()

export function getSave(file:string):EZSave<any> {
    let sav = activeSaves.get(file) ?? new EZSave(file)
    if (!activeSaves.has(file)) {
        activeSaves.set(file,sav)
    }
    return sav
}