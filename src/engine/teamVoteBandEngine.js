"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamVoteBand = getTeamVoteBand;
exports.calculateTeamVoteBand = calculateTeamVoteBand;
function getTeamVoteBand(averageVote) {
    if (averageVote < 5)
        return 'FASCIA_0';
    if (averageVote < 5.5)
        return 'FASCIA_1';
    if (averageVote < 6)
        return 'FASCIA_2';
    if (averageVote < 6.5)
        return 'FASCIA_3';
    return 'FASCIA_4';
}
function calculateTeamVoteBand(votes, noVotePolicy = { policy: 'ZERO' }) {
    if (votes.length !== 25) {
        throw new Error(`La rosa deve contenere 25 voti/giocatori (ricevuti: ${votes.length})`);
    }
    const playedCount = votes.filter(v => v.played && v.vote !== null && Number.isFinite(v.vote)).length;
    const notEvaluatedCount = votes.length - playedCount;
    let evaluatedCount = votes.length;
    let totalVoteSum = 0;
    for (const entry of votes) {
        const hasVote = entry.played && entry.vote !== null && Number.isFinite(entry.vote);
        if (hasVote) {
            totalVoteSum += entry.vote;
        }
        else if (noVotePolicy.policy === 'FIVE') {
            totalVoteSum += 5;
        }
        else if (noVotePolicy.policy === 'EXCLUDE' ||
            noVotePolicy.policy === 'PLAYER_ZERO_TEAM_EXCLUDE' ||
            noVotePolicy.policy === 'PLAYER_MALUS_TEAM_EXCLUDE') {
            evaluatedCount--;
        }
    }
    const averageVote = evaluatedCount > 0 ? totalVoteSum / evaluatedCount : 0;
    return {
        totalVoteSum,
        averageVote,
        playedCount,
        evaluatedCount,
        notEvaluatedCount,
        rosterSize: votes.length,
        teamBand: getTeamVoteBand(averageVote),
        noVotePolicy: noVotePolicy.policy,
        fixedNoVoteMalusPct: noVotePolicy.policy === 'FIXED_MALUS' || noVotePolicy.policy === 'PLAYER_MALUS_TEAM_EXCLUDE'
            ? noVotePolicy.fixedMalusPct ?? -5
            : 0,
    };
}
//# sourceMappingURL=teamVoteBandEngine.js.map