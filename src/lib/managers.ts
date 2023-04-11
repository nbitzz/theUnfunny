import { Message } from "discord.js";
import { CommandAndControl } from "./CommandAndControl";
import { SlashCommandManager } from "./SlashCommandManager";

export abstract class BaseChannelManager {
    
    control: CommandAndControl
    commands: SlashCommandManager

    constructor( control: CommandAndControl, commands: SlashCommandManager ) {

        this.control = control;
        this.commands = commands;

    }

    abstract recieve ( message: Message ) : void
    abstract readonly name : string

}