export interface DeploymentTarget {
  platform: 'vercel' | 'railway' | 'netlify';
  projectName: string;
  repoUrl: string;
  buildCommand: string;
  startCommand: string;
  environmentVariables?: Record<string, string>;
}

export interface DeploymentResult {
  success: boolean;
  platform: string;
  deploymentUrl?: string;
  deploymentId?: string;
  logs: string[];
  duration: number;
  error?: string;
}

export interface Submission {
  bountyId: string;
  title: string;
  description: string;
  repositoryUrl: string;
  deploymentUrl?: string;
  submissionUrl: string;
  timestamp: Date;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
}

export interface SubmissionResult {
  success: boolean;
  submissionId?: string;
  message: string;
  bountyReward?: number;
  timestamp: Date;
}

export interface AgentLog {
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  context?: Record<string, any>;
}

export interface AgentMetrics {
  totalBountiesDiscovered: number;
  totalBountiesAttempted: number;
  totalSuccessfulSubmissions: number;
  totalRewardEarned: number;
  successRate: number;
  averageTimePerBounty: number; // in minutes
  totalEarnings: number;
}
