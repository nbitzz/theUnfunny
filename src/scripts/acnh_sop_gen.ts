import axios from "axios"
import fs from "fs"

// quick script for generating
// animalcrossing.json

axios.get("https://raw.githubusercontent.com/Norviah/animal-crossing/master/json/data/Villagers.json").then((d) => {
    fs.writeFile(__dirname+"/animalcrossing.json",JSON.stringify(
        d.data.map((e:{name:string,photoImage:string}) => {
            return {name:e.name,image:e.photoImage}
        })
    ),()=>{})
})