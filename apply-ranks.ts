import { GuildMember } from "discord.js";

const ranks = [
    {
        roleID: '',
        scoreCount: 10
    }
];

export default async (score: number, member: GuildMember) => {

    for (let rank of ranks.sort((a, b) => b.scoreCount - a.scoreCount)) {
        // If the guild doesn't contain the rank anymore
        if (!member.guild.roles.cache.has(rank.roleID)) continue;
        // If the member can't obtain the rank
        if (rank.scoreCount < rank.scoreCount) {
            // If the member doesn't have the rank
            if (!member.roles.cache.has(rank.roleID)) continue;
            // Remove the ranks
            await member.roles.remove(rank.roleID);
        } else {
            // If the member already has the rank
            if (member.roles.cache.has(rank.roleID)) continue;
            // Add the role to the member
            await member.roles.add(rank.roleID);
        }
    }

};
