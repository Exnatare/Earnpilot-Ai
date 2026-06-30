import { Bounty, BountyScore } from '../types/bounty.js';

class BountyFilter {
  /**
   * Filter bounties by difficulty level
   */
  filterByDifficulty(bounties: Bounty[], difficulty: 'Beginner' | 'Intermediate' | 'Advanced'): Bounty[] {
    return bounties.filter(b => b.difficulty === difficulty);
  }

  /**
   * Filter bounties by reward range
   */
  filterByRewardRange(bounties: Bounty[], minReward: number, maxReward: number): Bounty[] {
    return bounties.filter(b => b.reward >= minReward && b.reward <= maxReward);
  }

  /**
   * Filter bounties by category
   */
  filterByCategory(bounties: Bounty[], categories: string[]): Bounty[] {
    return bounties.filter(b => categories.includes(b.category));
  }

  /**
   * Filter bounties by tags
   */
  filterByTags(bounties: Bounty[], requiredTags: string[]): Bounty[] {
    return bounties.filter(b =>
      requiredTags.some(tag => b.tags.includes(tag))
    );
  }

  /**
   * Filter bounties expiring soon
   */
  filterExpiringBounties(bounties: Bounty[], hoursThreshold: number = 48): Bounty[] {
    const now = Date.now();
    return bounties.filter(b => {
      const deadline = new Date(b.deadline).getTime();
      const hoursRemaining = (deadline - now) / (1000 * 60 * 60);
      return hoursRemaining <= hoursThreshold && hoursRemaining > 0;
    });
  }

  /**
   * Filter bounties with high reward-to-effort ratio
   */
  filterHighValueBounties(bounties: Bounty[]): Bounty[] {
    return bounties.filter(b => {
      // High value: high reward with lower difficulty
      const difficultyMultiplier =
        b.difficulty === 'Beginner' ? 1 :
        b.difficulty === 'Intermediate' ? 0.66 :
        0.33;

      const valueScore = b.reward * difficultyMultiplier;
      return valueScore > 1000; // Arbitrary threshold
    });
  }

  /**
   * Score bounties for prioritization
   */
  scoreBounties(bounties: Bounty[]): BountyScore[] {
    return bounties.map(bounty => {
      const rewardScore = this.calculateRewardScore(bounty.reward);
      const difficultyScore = this.calculateDifficultyScore(bounty.difficulty);
      const deadlineScore = this.calculateDeadlineScore(bounty.deadline);
      const categoryScore = this.calculateCategoryScore(bounty.category);

      const totalScore = (rewardScore + difficultyScore + deadlineScore + categoryScore) / 4;

      return {
        bountyId: bounty.id,
        title: bounty.title,
        score: totalScore,
        breakdown: {
          rewardScore,
          difficultyScore,
          deadlineScore,
          categoryScore,
        },
        recommended: totalScore > 70,
      };
    });
  }

  /**
   * Get top N bounties by score
   */
  getTopBounties(bounties: Bounty[], limit: number = 5): BountyScore[] {
    const scored = this.scoreBounties(bounties);
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Private: Calculate reward score (0-100)
   */
  private calculateRewardScore(reward: number): number {
    // More reward = higher score, but with diminishing returns
    // Scale: 0-5000 USDC maps to 0-100 score
    return Math.min((reward / 5000) * 100, 100);
  }

  /**
   * Private: Calculate difficulty score (0-100)
   * Lower difficulty = higher score (easier bounties prioritized)
   */
  private calculateDifficultyScore(difficulty: string): number {
    const scores: Record<string, number> = {
      'Beginner': 100,
      'Intermediate': 70,
      'Advanced': 40,
    };
    return scores[difficulty] || 50;
  }

  /**
   * Private: Calculate deadline score (0-100)
   * Bounties expiring soon get higher scores
   */
  private calculateDeadlineScore(deadline: string): number {
    const now = Date.now();
    const deadlineTime = new Date(deadline).getTime();
    const hoursRemaining = (deadlineTime - now) / (1000 * 60 * 60);

    if (hoursRemaining <= 0) return 0; // Expired
    if (hoursRemaining <= 24) return 100; // Urgent
    if (hoursRemaining <= 72) return 75; // Soon
    if (hoursRemaining <= 168) return 50; // One week
    return 25; // More than a week
  }

  /**
   * Private: Calculate category score (0-100)
   * Prioritize development/technical categories
   */
  private calculateCategoryScore(category: string): number {
    const prioritizedCategories: Record<string, number> = {
      'Development': 100,
      'Smart Contracts': 95,
      'Web3': 90,
      'Infrastructure': 85,
      'API Integration': 80,
      'Documentation': 60,
      'Design': 40,
      'Content': 30,
    };
    return prioritizedCategories[category] || 50;
  }
}

export const bountyFilter = new BountyFilter();
