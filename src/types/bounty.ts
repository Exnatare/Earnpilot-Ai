export interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardCurrency: 'USDC' | 'SOL' | 'USD';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  tags: string[];
  deadline: string;
  status: 'Open' | 'In Progress' | 'Closed';
  submissionUrl?: string;
  requirements: string[];
  deliverables: string[];
}

export interface Hackathon {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  prizes: {
    total: number;
    distribution: Prize[];
  };
  participantLimit?: number;
  status: 'Upcoming' | 'Active' | 'Completed';
  website?: string;
  registrationUrl?: string;
}

export interface Prize {
  placement: string;
  amount: number;
  currency: string;
}

export interface BountyScore {
  bountyId: string;
  title: string;
  score: number;
  breakdown: {
    rewardScore: number;
    difficultyScore: number;
    deadlineScore: number;
    categoryScore: number;
  };
  recommended: boolean;
}

export interface SuperteamResponse {
  success: boolean;
  data: Bounty[] | Hackathon[];
  error?: string;
}
