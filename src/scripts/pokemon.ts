// this is really, REALLY bad code but I'm literally only going to use this once.

import { createInterface } from "readline/promises";
import { load } from "cheerio"
import axios from "axios";
import fs from "fs"

let readline = createInterface(process.stdin,process.stdout)

async function ask(options:string[]):Promise<string> {
    console.log(options.map((v,x) => `[${x}] ${v}`).join("\n"))
    let v = parseInt(await readline.question("What would you like to do?"),10)
    if (options[v]) {
        return options[v]
    } else {
        return await ask(options)
    }
}

function getImageUrl(page:string):string {
    let $ = load(page)
    return $(`div[class="grid-col span-md-6 span-lg-4 text-center"] img`).attr('src') || ""
}

interface Pokemon {
    name:string,
    pokedexurl:string,
}

(async () => {
    
    let pokemon:Pokemon[] = []

    console.log("theUnfunny Pokemon SOP List Generator")
    console.log("(There's probably a better way to do this, but I don't have time.)")
    console.log("-".repeat(50))
    console.log("Fetching pokedex from pokemondb.net...")
    
    let data = await axios.get("https://pokemondb.net/pokedex/all")

    console.log("Scraping page...")

    let $ = load(data.data)

    $(".cell-name > .ent-name").map((x,v) => {
        let pokemon_label = $(v)
        if (pokemon_label.parent().find('text-muted') && !pokemon.find(e => e.name == pokemon_label.text()))
        pokemon.push({
            name:pokemon_label.text(),
            pokedexurl:"https://pokemondb.net"+pokemon_label.attr("href")
        })
    })

    console.log(`Found ${pokemon.length} Pokemon.`)

    let result = await ask([
        "Gen 9"
    ])

    let ranges:{[key:string]:[number,number]} = {
        "Gen 9":[905,1007]
    }

    let target = pokemon.slice(...ranges[result])
    let sopList = []
    for (let i = 0; i < target.length; i++) {
        sopList.push({
            name:`#${1+i+ranges[result][0]} ${target[i].name}`,
            image:getImageUrl((await axios.get(target[i].pokedexurl)).data)
        })
    }

    fs.writeFile(__dirname+`/${result}.json`,JSON.stringify(
        sopList
    ),()=>{
        process.exit()
    })
})()