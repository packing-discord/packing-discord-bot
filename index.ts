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
    fetchVoiceActivityLeaderboard,
    // getMessagesLeaderboard
} from './db';
import { Client, MessageEmbed, TextChannel, VoiceChannel, WSEventType } from 'discord.js';
import { SlashCreator, GatewayServer } from 'slash-create';
import { join } from 'path';
import { formatMessageActivityLeaderboard, formatVoiceActivityLeaderboard } from './leaderboards';

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

const updateActivityLeaderboard = async () => {
    const activityLeaderboardChannel = client.channels.cache.get(process.env.LEADERBOARD_ACTIVITY_ID!) as TextChannel;
    const messages = await activityLeaderboardChannel.messages.fetch();

    const infoMessageContent = '**Leaderboards are updated every 10 seconds!**';
    const infoMessage = messages.find((message) => message.content.includes(infoMessageContent));
    if (!infoMessage) await activityLeaderboardChannel.send(infoMessageContent).then((m) => m.edit(`@everyone\n\n${m.content}`));

    const voiceEmbedFooter = 'Join a voice channel to appear in the leaderboard!';
    const voiceActivityEmbed = messages.find((message) => message.embeds[0]?.footer?.text === voiceEmbedFooter);

    const messageEmbedFooter = 'Send some messages to appear in the leaderboard!';
    const messageActivityEmbed = messages.find((message) => message.embeds[0]?.footer?.text === messageEmbedFooter);

    const formattedVoiceActivityLeaderboard = await formatVoiceActivityLeaderboard(client);
    const newVoiceEmbed = new MessageEmbed()
        .setTitle('🔊 Voice activity leaderboard 🏆')
        .addField('Top 10 (7 days)', '\u200B\n'+formattedVoiceActivityLeaderboard.map((entry, idx) => `#${++idx} **${entry.user.username}** - Time: **${entry.time}**`).join('\n'))
        .setFooter(voiceEmbedFooter)
        .setColor('#FF0000');

    const formattedMessageActivityLeaderboard = await formatMessageActivityLeaderboard(client);
    const newMessageEmbed = new MessageEmbed()
        .setTitle('📨 Message activity leaderboard 🏆')
        .addField('Top 10 (7 days)', '\u200B\n'+formattedMessageActivityLeaderboard.map((entry, idx) => `#${++idx} **${entry.user.username}** - Messages: **${entry.count}**`).join('\n'))
        .setFooter(messageEmbedFooter)
        .setColor('#FF0000');

    if (!voiceActivityEmbed) activityLeaderboardChannel.send(newVoiceEmbed);
    else voiceActivityEmbed.edit({ embed: newVoiceEmbed });
    if (!messageActivityEmbed) activityLeaderboardChannel.send(newMessageEmbed);
    else messageActivityEmbed.edit({ embed: newMessageEmbed });

};

client.on('ready', () => {
    console.log(`Ready. Logged in as ${client.user?.username}`);
    terminateVoiceActivities();
    client.channels.cache.filter((channel) => channel.type === 'voice').forEach((channel) => {
        (channel as VoiceChannel).members.forEach((member) => {
            startVoiceActivity(member.user.id, channel.id);
        });
    });
    updateActivityLeaderboard();
    setInterval(() => updateActivityLeaderboard(), 10000);
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
