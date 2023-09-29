import axios from "axios"
let _config = require("../../config.json")

export default async function authenticate_monofile(share: Map<string, any>) {
    // please just work
    share.set("monofileAuthKey", ((await
        axios.post(`${_config.monofile}/auth/login`, { username: _config.monofile_credentials.username, password: _config.monofile_credentials.password })
    ).headers["set-cookie"] || [""])[0].split("=")[1])
}
