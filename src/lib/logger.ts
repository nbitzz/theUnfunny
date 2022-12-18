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

            this.prefix = `\x1b[1;38;2${this.color.replace(/\,/g,";")}m${name}\x1b[0m/`

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
    logColor:string
}

export const LogTypes:{[key:string]:LogType} = {
    info    : { logColor: "94"       },
    log     : { logColor: "38;5;246" },
    error   : { logColor: "1;91"     },
    warning : { logColor: "1;93"     },
    success : { logColor: "1;92"     }
};



export class Logger {
    readonly name : string
    readonly group?: Groups.LoggerGroup

    constructor(name:string, group?:Groups.LoggerGroupResolvable) {
        this.name = name;
        if (group) {
            let resolved = Groups.resolve(group)
            if (resolved) this.group = resolved;
        }
    }

    _log(message:string,type:LogType) {
        console.log(
            `\x1b[${type.logColor}m•\x1b[0m [${this.group ? this.group.prefix : ""}${this.name}] ${message}`
        )
    }

    log     = (message:string) => this._log( message, LogTypes.log     )
    info    = (message:string) => this._log( message, LogTypes.info    )
    error   = (message:string) => this._log( message, LogTypes.error   )
    warn    = (message:string) => this._log( message, LogTypes.warn    )
    success = (message:string) => this._log( message, LogTypes.success )
}