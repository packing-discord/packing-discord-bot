import { config } from 'dotenv';

// configure environment variables
config();

import './api';

import {
    savePing,
    startVoiceActivity,
    endVoiceActivity,
    terminateVoiceActivities,
    addMessage,
    markExpenditurePaid,
    getVoiceChannelAuthor,
    getStaffLeaderboardEntries,
    createLeaderboardEntry,
    deleteUnusedLeaderboardEntries,
    assignVote
} from './db';
import { Client, MessageEmbed, TextChannel, VoiceChannel, WSEventType, CategoryChannel, Message, Snowflake, GuildMember } from 'discord.js';
import { SlashCreator, GatewayServer } from 'slash-create';
import { join } from 'path';
import { formatMessageActivityLeaderboard, formatScoreLeaderboard, formatVoiceActivityLeaderboard } from './leaderboards';
import PayPal from 'paypal-api';
import humanizeDuration from 'humanize-duration';
import { getUsers, updateUser } from './sequelize-user';
import { updateUserLastSeenAt } from './sequelize-presence';
import chalk from 'chalk';

const client = new Client({
    fetchAllMembers: true,
    partials:  ['MESSAGE', 'CHANNEL', 'REACTION', 'GUILD_MEMBER']
});

const paypal = new PayPal({
    clientID: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    sandboxMode: process.env.PAYPAL_ACCOUNT_TYPE! === 'sandbox'
});

client.on('messageReactionAdd', async (reaction, user) => {
	if (reaction.partial) await reaction.fetch();

    if (user.id !== process.env.TRANSACTION_APPROVAL_USER_ID) return;
    if (reaction.message.channel.id !== process.env.TRANSACTION_CHANNEL) return;

    const embed = reaction.message.embeds[0];
    if (!embed) return;

    const transactionID = embed.fields.find((field) => field.name === 'Transaction ID')?.value!;
    const userEmail = embed.fields.find((field) => field.name === 'User email')?.value!;
    const productPrice = embed.fields.find((field) => field.name === 'Product price')?.value!;
    const paymentStatus = embed.fields.find((field) => field.name === 'Status')?.value!;

    if (!paymentStatus.includes('Processing')) return;
    else {
        reaction.remove();
        const newEmbed = embed;
        embed.fields = embed.fields.filter((f) => f.name !== 'Status');
        embed.addField('Status', 'Completed ✅');
        reaction.message.edit(newEmbed);

        markExpenditurePaid(transactionID)
    }
    
});

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

export const updateWinsLeaderboard = async () => {
    const scoreLeaderboardChannel = client.channels.cache.get(process.env.LEADERBOARD_SCORES_ID!) as TextChannel;
    const messages = await scoreLeaderboardChannel.messages.fetch();

    const scoreEmbedFooter = 'Play to increase your score!';
    const scoreEmbed = messages.find((message) => message.embeds[0]?.footer?.text === scoreEmbedFooter);

    const formattedVoiceActivityLeaderboard = await formatScoreLeaderboard(client);
    const newScoreEmbed = new MessageEmbed()
        .setTitle('🎤 Packing leaderboard 🏆')
        .addField('Top 10 (lifetime)', '\u200B\n'+formattedVoiceActivityLeaderboard.map((entry, idx) => `#${++idx} **${entry.user.username}** - Score: **${entry.total}** (${entry.wins} wins / ${entry.losses} losses)`).join('\n'))
        .setFooter(scoreEmbedFooter)
        .setColor('#FF0000');

    if (!scoreEmbed) scoreLeaderboardChannel.send(newScoreEmbed);
    else scoreEmbed.edit({ embed: newScoreEmbed });
};

const emptyChannels = new Set();

const deleteEmptyEvent = () => {
    const server = client.guilds.cache.get(process.env.GUILD_ID!);
    const category = server?.channels.cache.get(process.env.HOST_CHANNELS_CATEGORY!) as CategoryChannel;
    category.children.forEach((channel) => {
        if (channel.members.size === 0) {
            const shouldBeDeleted = emptyChannels.has(channel.id);
            if (shouldBeDeleted) {
                console.log(`Event channel ${channel.name} has been deleted!`);
                channel.delete();
                emptyChannels.delete(channel.id);
            } else {
                console.log(`Event channel ${channel.name} is going to be deleted!`);
                emptyChannels.add(channel.id);
            }
        } else {
            emptyChannels.delete(channel.id);
        }
    });
}

const checkHunger = () => {
    getUsers().then((users) => {
        users.forEach((user) => {
            let newHunger = user.hunger - 0.023;
            let newHealth = user.health;
            let newMoney = user.money;
            let newFoods = user.foods;
            if (newHunger <= 0) {
                newHunger = 0;
                if (user.hunger > 0) {
                    // send warning message
                    client.users.fetch(user.id).then((u) => u.send(':fries: Watch out! You will starve if you do not eat within the next 3 hours!'));
                }
                newHealth = newHealth - 0.55;
                if (newHealth < 0) {
                    // reset the stats
                    newHealth = 100;
                    newHunger = 100;
                    newMoney = 0;
                    newFoods = [];
                    // send warning message
                    client.users.fetch(user.id).then((u) => u.send(':confused: You starved to death...'));
                }
            }
            updateUser(user.id, {
                health: newHealth,
                money: newMoney,
                foods: newFoods,
                hunger: newHunger
            });
        });
    });
}

interface StaffLeaderboardEntry {
    user_id: string;
    emoji: string;
    count: number;
    username: string;
}

let staffLeaderboardEntries: StaffLeaderboardEntry[]|null = null;
let staffLeaderboardMessage: Message|null = null;

const getStaffLeaderboardContent = () => {
    let content = `**Staff Leaderboard** 🌟\nReact with the right emoji to upvote someone!`;
    staffLeaderboardEntries?.forEach((entry) => {
        content += `\n\n${entry.emoji} | **${entry.username}** - ${entry.count}`;
    });
    return content;
}

const synchronizeStaffLeaderboard = async () => {

    const circles = ['🔵', '🔴', '🟢', '🟠', '🟣', '⚪', '🟡', '⚫', '🟤', '🎨', '🫒', '🛼', '🌈', '🌊', '🎈', '🎉', '🎊', '🎁', '🎀'];

    // this function will fetch all the staff members and create or update the leaderboard
    const guild = client.guilds.cache.get(process.env.GUILD_ID!);
    const channel = guild?.channels.cache.get(process.env.STAFF_LEADERBOARD_ID!) as TextChannel;

    const staffLeaderboardEntriesDB = await getStaffLeaderboardEntries();
    staffLeaderboardEntries = [];
    const staff = guild?.members.cache.filter(m => m.roles.cache.has(process.env.STAFF_ROLE!)).array()!;
    for (let staffMember of staff) {
        // check if there is an entry, and if there is not create, it
        const entry = staffLeaderboardEntriesDB.find((entry) => entry.user_id === staffMember.id);
        if (!entry) {
            const entryData = {
                user_id: staffMember.id,
                emoji: circles.find((c) => !staffLeaderboardEntriesDB.some((e) => e.emoji === c) && !staffLeaderboardEntries?.some((e) => e.emoji === c))!
            }
            staffLeaderboardEntries.push({
                ...entryData,
                count: 0,
                username: staffMember.user.username
            });
            await createLeaderboardEntry(entryData);
        } else staffLeaderboardEntries.push({
            ...entry,
            username: staffMember.user.username
        })
    }

    console.log(`Deleting not in ${staffLeaderboardEntries.map((e) => e.emoji)}`);
    await deleteUnusedLeaderboardEntries(staffLeaderboardEntries.map((e) => e.emoji));

    const messages = await channel.messages.fetch();
    // find the first message sent by the client
    const message = messages.find((message) => message.author.id === client.user?.id);
    const content = getStaffLeaderboardContent();
    if (!message) channel.send(content).then((m) => staffLeaderboardMessage = m);
    else {
        staffLeaderboardMessage = message;
        message?.edit(content);
    }

    staffLeaderboardEntries.forEach((entry) => {
        console.log(`Reacting with ${entry.emoji}`);
        message?.react(entry.emoji);
    });

}

interface WaitingRole {
    value: Snowflake;
    time: number;
}

let waitingForRoles: WaitingRole[] = [];

const changeRole = async (member: GuildMember, roleID: Snowflake, type: 'add' | 'remove') => {
    if (waitingForRoles.some((element) => element.value === member.id)) {
        console.log(chalk.yellow(`${member.user.tag} is still waiting for their roles...`));
    }
    waitingForRoles.push({
        value: member.id,
        time: Date.now()
    });
    const promise = type === 'add' ? member.roles.add(roleID) : member.roles.remove(roleID);
    promise.then(() => {
        console.log(chalk.green(`[${waitingForRoles.length}] ${member.user.tag} has got their roles!`));
        waitingForRoles = waitingForRoles.filter((element) => element.value !== member.id);
    });
}

setInterval(() => {
    const time = Date.now();
    waitingForRoles = waitingForRoles.filter((item) => {
        return time < item.time + (30000);
    });
}, 500);

const lastAutoroleCheckedAt: number|null = null;
const checkAutoRole = async () => {
    const server = client.guilds.cache.get(process.env.GUILD_ID!);
    const tgRole = server?.roles.cache.get(process.env.TG_ROLE!)!;
    const statusRole = server?.roles.cache.get(process.env.STATUS_ROLE!)!;

    if (!lastAutoroleCheckedAt || (lastAutoroleCheckedAt + (60000*10) < Date.now())) {
        await server?.members.fetch();
    }

    server?.members.cache.forEach((member) => {
        const hasStatusPresence = member.user.presence.activities[0]?.state?.includes('.gg/packing');
        const hasStatusRole = member.roles.cache.has(statusRole.id);

        if (hasStatusPresence && !hasStatusRole) {
            changeRole(member, statusRole.id, 'add');
        } else if (!hasStatusPresence && hasStatusRole) {
            changeRole(member, statusRole.id, 'remove');
        }
    });
}

client.on('ready', () => {
    console.log(`Ready. Logged in as ${client.user?.username}`);
    terminateVoiceActivities();
    client.channels.cache.filter((channel) => channel.type === 'voice').forEach((channel) => {
        (channel as VoiceChannel).members.forEach((member) => {
            startVoiceActivity(member.user.id, channel.id);
        });
    });
    updateActivityLeaderboard();
    updateWinsLeaderboard();
    synchronizeStaffLeaderboard();
    checkHunger();
    checkAutoRole();
    setInterval(() => updateActivityLeaderboard(), 10000);
    setInterval(() => updateWinsLeaderboard(), 10000);
    setInterval(() => deleteEmptyEvent(), 10000);
    setInterval(() => synchronizeStaffLeaderboard(), 60 * 1000 * 60);
    setInterval(() => checkHunger(), 60 * 1000);
    setInterval(() => checkAutoRole(), 30000);
});

client.on('messageReactionAdd', async (reaction, user) => {

    const message = reaction.message;
    const channel = message.channel as TextChannel;

    if (channel.id !== process.env.STAFF_LEADERBOARD_ID) return;
    if (user.bot) return;

    const staff = staffLeaderboardEntries?.find((entry) => entry.emoji === reaction.emoji.name);
    if (!staff) return;

    await assignVote(user.id, staff.user_id);
    staffLeaderboardEntries = (await getStaffLeaderboardEntries()).map((e) => ({
        ...e,
        username: channel.guild.members.cache.get(e.user_id)?.user.username
    }));
    const content = getStaffLeaderboardContent();
    staffLeaderboardMessage?.edit(content);

});

client.on('voiceStateUpdate', async (oldState, newState) => {

    if (!newState.member) return;

    if (newState.channelID === process.env.UNMUTE_CHANNEL_ID) {
        newState.member.voice.setMute(false);
        return;
    }

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

client.on('channelDelete', async (channel) => {

    if (channel.type !== 'voice') return;
    const voice = channel as VoiceChannel;
    if (voice.parentID !== process.env.HOST_CHANNELS_CATEGORY) return;

    const userID = await getVoiceChannelAuthor(channel.id);
    const eventDuration = humanizeDuration(Date.now() - channel.createdTimestamp);
    const embed = new MessageEmbed()
        .setDescription(`The event (${voice.name}) lasted ${eventDuration}`)
        .setColor('#000000')
    if (userID) {
        const user = await client.users.fetch(userID);
        embed.setAuthor(`End of event channel created by ${user.tag}`, user.displayAvatarURL());
    } else {
        embed.setAuthor(`End of event channel created by Unknown#0000`);
    }

    (client.channels.cache.get(process.env.HOST_LOGS_CHANNEL!)! as TextChannel).send(embed);

});

client.on('presenceUpdate', async (oldPresence, newPresence) => {

    console.log(`${newPresence.user?.tag} (${newPresence.userID} moved from ${oldPresence?.status} to ${newPresence.status}`);
    if (oldPresence?.status !== 'offline' && newPresence.status === 'offline') {
        updateUserLastSeenAt(newPresence.userID);
    }

});

client.on('message', (message) => {

    if (message.author.bot) return;

    addMessage(message.author.id, message.channel.id);

});

client.login(process.env.TOKEN!);

export default client;
