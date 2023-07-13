import { EZSave, getSave } from "../lib/ezsave"

let policyDB: EZSave<ilibpolicy.ServerPolicy> = getSave(`${process.cwd()}/.data/policy.json`)

export namespace ilibpolicy {


    export let policies = {
        permittedLanguage: {
            default: "Allow slurs",
            choices: ["Clean content only", "Allow insensitive content", "Allow slurs"]
        },
        permittedSexualContent: {
            default: "Heavily suggestive content",
            choices: ["Safe for work only", "Suggestive content", "Heavily suggestive content"]
        } 
    } as const

    export type policy = keyof typeof policies

    export type ServerPolicy = {
        [key in policy] : typeof policies[key]["choices"][number]
    }

    export function getAllPoliciesFor(server: string) {
        let plc = policyDB.data[server] || {}

        // fill in the blanks

        for (let [key, value] of Object.entries(policies)) {
            if (!(key in plc)) {
                // @ts-ignore i'm tired with writing types today man ive got better things to do
                plc[key] = value.default
            }
        } 

        return plc
    }

}

export function setPolicy(server: string, policy: ilibpolicy.policy, value: typeof ilibpolicy.policies[typeof policy]["choices"][number]) {

    let policies = ilibpolicy.getAllPoliciesFor(server)
    // @ts-ignore ditto
    policies[policy] = value
    policyDB.set_record(server, policies)

}

export function getPolicy(server: string, policy: ilibpolicy.policy): typeof ilibpolicy.policies[typeof policy]["choices"][number] {

    return ilibpolicy.getAllPoliciesFor(server)[policy]

}