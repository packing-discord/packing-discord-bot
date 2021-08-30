import { GuildMember } from "discord.js";

const ranks = [{roleID: "825503183698001930",scoreCount:1,keepRank: true},{roleID: "822905031187365888",scoreCount:3},{roleID: "822905030485999667",scoreCount:3},{roleID: "822905029186158604",scoreCount:6},{roleID: "822905030046646312",scoreCount:6},{roleID: "822905028657676289",scoreCount:9},{roleID: "822905027944906762",scoreCount:9},{roleID: "822905027198451712",scoreCount:12},{roleID: "822905026858450944",scoreCount:12},{roleID: "822905025218215947",scoreCount:15},{roleID: "822905026115797052",scoreCount:15},{roleID: "822905024983465994",scoreCount:20},{roleID: "822905024153649193",scoreCount:20},{roleID: "822905022899290172",scoreCount:25},{roleID: "822905023565529138",scoreCount:25},{roleID: "822905022114168852",scoreCount:30},{roleID: "822905021368500245",scoreCount:30},{roleID: "822905021112254464",scoreCount:40},{roleID: "822905020432515183",scoreCount:40},{roleID: "822905019002650624",scoreCount:50},{roleID: "822905019719745556",scoreCount:50},{roleID: "822905018951794718",scoreCount:70},{roleID: "822905017991299162",scoreCount:70}];

export default async (score: number, member: GuildMember) => {

    for (let rank of ranks.sort((a, b) => b.scoreCount - a.scoreCount)) {
        // If the guild doesn't contain the rank anymore
        if (!member.guild.roles.cache.has(rank.roleID)) continue;
        // If the member can't obtain the rank
        if (score < rank.scoreCount) {
            // If the member doesn't have the rank
            if (!member.roles.cache.has(rank.roleID) || rank.keepRank) continue;
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
