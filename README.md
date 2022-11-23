# theUnfunny

An unfunny Discord bot.

## How to use

Don't

## Prerequisites

`discord.js` v14, `axios`, and `typescript`. 

If you want to use the `play` command, install `linkifyjs`, `@discordjs/voice`, and [its dependencies](https://www.npmjs.com/package/@discordjs/voice#dependencies). If you don't want to use the `play` command, make sure to remove the `src/commands/play.ts` file and the `src/commands/stop.ts` file before compilation to avoid errors.

Don't use `/what` lmao, it's really stupid, but I guess that's what this bot is for. If you want to set it up, set up a Roblox account and insert its token in config.json under "what-token". Also install `cheerio`, I guess. If you don't want to use it, delete `src/commands/what.ts`, `assets/what`, and `src/lib/rbx`.


## config.json

```json
{
    "token":"kill.yourself-NOW!!"
}
```