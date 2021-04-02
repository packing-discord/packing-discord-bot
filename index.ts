import { config } from 'dotenv';

// configure environment variables
config();

import {

    savePing,

    // addScoreEvent,

    startVoiceActivity,
    endVoiceActivity,
    terminateVoiceActivities,

    addMessage,

    // getWinLeaderboard,
    // getVoiceLeaderboard,
    // getMessagesLeaderboard
} from './db';
import { Client, VoiceChannel, WSEventType } from 'discord.js';
import { SlashCreator, GatewayServer } from 'slash-create';
import { join } from 'path';

const client = new Client();

const creator = new SlashCreator({
    applicationID: process.env.APP_ID!,
    token: process.env.TOKEN!
});
  
creator
.withServer(
    new GatewayServer(
        (handler) => client.ws.on('INTERACTION_CREATE' as WSEventType, handler)
    )
)
.registerCommandsIn(join(__dirname, 'commands'))
.syncCommandsIn(process.env.GUILD_ID!);

setInterval(() => savePing(), 5000);

client.on('ready', () => {
    console.log(`Ready. Logged in as ${client.user?.username}`);
    terminateVoiceActivities();
    client.channels.cache.filter((channel) => channel.type === 'voice').forEach((channel) => {
        (channel as VoiceChannel).members.forEach((member) => {
            startVoiceActivity(member.user.id, channel.id);
        });
    });
});

client.on('voiceStateUpdate', async (oldState, newState) => {

    if (!newState.member) return;

    // if someone joined a channel
    if (!oldState.channelID && newState.channelID) {
        startVoiceActivity(newState.member.id, newState.channelID);
        console.log(`[+] New voice activity created for user ${newState.member.user.username}`);
    }

    // if someone left a channel
    else if (oldState.channelID && !newState.channelID) {
        endVoiceActivity(newState.member.id);
        console.log(`[x] Voice activity ended for user ${newState.member.user.username}`);
    }

});

client.on('message', (message) => {

    if (message.author.bot) return;

    addMessage(message.author.id, message.channel.id);

});

client.login(process.env.TOKEN!);

export default client;
