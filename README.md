# theUnfunny

An unfunny Discord bot.

## How to use

Don't

## Prerequisites

`discord.js` v14, `axios`, and `typescript`. 

If you want to use the `play` command, install `linkifyjs`, `google-tts-api`, `cheerio`, `@discordjs/voice`, and [its dependencies](https://www.npmjs.com/package/@discordjs/voice#dependencies). If you don't want to use the `play` command, make sure to remove the `src/commands/play.ts` file and the `src/commands/stop.ts` file before compilation to avoid errors.


## config.json

```js
{
    "token":"kill.yourself-NOW!!",
    // required to use /meme, requires monofile 1.1.2+
    "monofile":"https://monofile.glitch.me" // must NOT include trailing slash
}
```

## 1.0 todo

- [X] /boom
- [X] /losefaith
- [X] /play
    - [X] url
    - [X] file
    - [X] sfx
    - [X] tts
    - [X] dectalk
    - [X] ~~15ai~~ Give Up! (for context: 15ai has been down for a month straight)
- [X] /stop
- [X] /worsehighlow
    - [X] basic game
    - [X] move off of r34 json api and instead scrape with cheerio
- [ ] /smashorpass
    - [X] actual command
    - [ ] custom lists
    - [ ] crowdsourced smash or pass list selector
- [X] /wish
- [X] /stat
    - [X] command
    - [X] ~~s&box (developer preview torture service stats)~~ likely no longer possible due to stricter cloudflare limitations on asset.party
    - [X] ~~sale (next steam sale & time, steamdb.info)~~ giving up time
        - [X] ~~figure out how to bypass cloudflare~~
        - [X] ~~check if sale is active, if so, display remaining time~~
    - [X] posts on rule34
- [X] /musicalpipebomb (@user)
    - [X] command
    - [X] make songlist 
- [ ] /copypasta (string) - grabs from reddit r/copypasta
- [ ] command and control center
    - [X] generates eval command in server
    - [X] crowdsourced /meme command
    - [X] crowdsourced smash or pass list
    - [X] crowdsourced bot statuses
    - [ ] crowdsourced testimonials
    - [ ] crowdsourced bot avatars
- [ ] theUnfunny Network
    - [ ] servers that opt-in will be allowed to use certain network-only features
    - [ ] network will allow info from servers to be shared between eachother (ex. an All Server Emojis smash or pass list)
- [ ] Make codebase suck less ass
    - [ ] make /musicalpipebomb readable
    - [ ] same with /play (and use switch statements, you're not yanderedev split)

## 1.1 todo

- [ ] /barista
    - [ ] simple lang for automation
    - [ ] auto executing tasks