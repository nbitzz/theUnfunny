import { SlashCommandBuilder } from "discord.js";

export default class SlashCommand {
    readonly builder:SlashCommandBuilder

    constructor(builder:SlashCommandBuilder) {
        this.builder = builder;
    }
}