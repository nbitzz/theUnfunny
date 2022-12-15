# theUnfunny

An unfunny Discord bot.

## How to use

Don't

## Prerequisites

`discord.js` v14, `axios`, and `typescript`. 

If you want to use the `play` command, install `linkifyjs`, `google-tts-api`, `cheerio`, `@discordjs/voice`, and [its dependencies](https://www.npmjs.com/package/@discordjs/voice#dependencies). If you don't want to use the `play` command, make sure to remove the `src/commands/play.ts` file and the `src/commands/stop.ts` file before compilation to avoid errors.


## config.json

```json
{
    "token":"kill.yourself-NOW!!"
}
```

## 1.0 todo

- [X] /boom
- [X] /losefaith
- [ ] /play
    - [X] url
    - [X] file
    - [X] sfx
    - [X] tts
    - [X] dectalk
    - [ ] 15ai
- [X] /stop
- [ ] /worsehighlow
    - [X] basic game
    - [ ] move off of r34 json api and instead scrape with cheerio
- [X] /smashorpass
- [ ] /stat
    - [X] command
    - [X] ~~s&box (developer preview torture service stats)~~ likely no longer possible due to stricter cloudflare limitations on asset.party
    - [ ] sale (next steam sale & time, steamdb.info)
        - [ ] figure out how to bypass cloudflare
        - [ ] check if sale is active, if so, display remaining time
- [ ] /musicalpipebomb (@user)
    - [ ] command
    - [ ] make songlist 
- [ ] /copypasta (string) - grabs from reddit r/copypasta
- [ ] League of Legends watcher
- [ ] Make codebase suck less ass
    - [ ] make /musicalpipebomb readable
    - [ ] same with /play (and use switch statements, you're not yanderedev split)