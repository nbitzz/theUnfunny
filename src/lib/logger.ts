/*

    Logger
    neat logger module thingy

*/

export namespace Groups {

    export let Groups:Map<string,LoggerGroup> = new Map();

    export class LoggerGroup {
        readonly name:string
        readonly color:string
        readonly prefix:string

        constructor(name:string,color:string) {
            this.name = name;
            this.color = color;

            this.prefix = `\x1b[1;38;2;${this.color.replace(/\,/g,";")}m${name}\x1b[0m/`

            Groups.set(this.name,this)
        }
    }

    export type LoggerGroupResolvable = string|LoggerGroup

    export function resolve(resolvable:LoggerGroupResolvable):LoggerGroup|void {
        if (typeof resolvable == "string") return Groups.get(resolvable)
        else return resolvable
    }

}

export interface LogType {
    name:string,
    logColor:string
}

export interface LoggerPlugin {
    log: (logger:Logger,type:LogType,log:string) => void
}

export const LogTypes:{[key:string]:LogType} = {
    info    : { name: "info",    logColor: "94"       },
    log     : { name: "log",     logColor: "38;5;246" },
    error   : { name: "error",   logColor: "1;91"     },
    warning : { name: "warning", logColor: "1;93"     },
    success : { name: "success", logColor: "1;92"     }
};

let dfplugins:LoggerPlugin[] = []

export function use(plug:LoggerPlugin) {
    dfplugins.push(plug)
}

export class Logger {
    readonly name   : string
    readonly group? : Groups.LoggerGroup
    usePlugins      : boolean     = true

    constructor(name:string, group?:Groups.LoggerGroupResolvable) {
        this.name = name;

        if (group) {
            let resolved = Groups.resolve(group)
            if (resolved) this.group = resolved;
        }
    }

    _log(message:string,type:LogType) {
        if (this.usePlugins) dfplugins.forEach((v) => 
            v.log(this,type,message.toString())
        )

        console.log(
            `\x1b[${type.logColor}m•\x1b[0m [${this.group ? this.group.prefix : ""}${this.name}] ${message}`
        )
    }

    /* logger.log, etc */

    log     = (message:string) => this._log( message, LogTypes.log     )
    info    = (message:string) => this._log( message, LogTypes.info    )
    error   = (message:string) => this._log( message, LogTypes.error   )
    warn    = (message:string) => this._log( message, LogTypes.warning )
    success = (message:string) => this._log( message, LogTypes.success )
}