import { superteamService } from './superteam.js';
import { githubService } from './github.js';
import { Submission, SubmissionResult } from '../types/deployment.js';

class SubmissionService {
  /**
   * Submit solution to a bounty
   */
  async submitSolution(bountyId: string, submission: {
    title: string;
    description: string;
    repositoryUrl: string;
    deploymentUrl?: string;
  }): Promise<SubmissionResult> {
    try {
      console.log(`[SubmissionService] Submitting solution to bounty ${bountyId}...`);
      const startTime = Date.now();

      // Submit via Superteam API
      const result = await superteamService.submitSolution(bountyId, {
        title: submission.title,
        description: submission.description,
        githubUrl: submission.repositoryUrl,
        deploymentUrl: submission.deploymentUrl,
      });

      const duration = Date.now() - startTime;
      console.log(`[SubmissionService] ✓ Solution submitted in ${duration}ms`);

      return {
        success: true,
        submissionId: result.id,
        message: 'Solution successfully submitted to Superteam',
        bountyReward: result.reward,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`[SubmissionService] Submission failed: ${error}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };
    }
  }

  /**
   * Batch submit multiple solutions
   */
  async submitMultipleSolutions(submissions: Array<{
    bountyId: string;
    title: string;
    description: string;
    repositoryUrl: string;
    deploymentUrl?: string;
  }>): Promise<SubmissionResult[]> {
    try {
      console.log(`[SubmissionService] Submitting ${submissions.length} solutions...`);
      const results: SubmissionResult[] = [];

      for (const submission of submissions) {
        const result = await this.submitSolution(submission.bountyId, {
          title: submission.title,
          description: submission.description,
          repositoryUrl: submission.repositoryUrl,
          deploymentUrl: submission.deploymentUrl,
        });
        results.push(result);

        // Add delay between submissions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`[SubmissionService] ✓ All submissions completed`);
      return results;
    } catch (error) {
      throw new Error(`Batch submission failed: ${error}`);
    }
  }

  /**
   * Get submission status
   */
  async getSubmissionStatus(bountyId: string): Promise<{ status: string; reward?: number; message?: string }> {
    try {
      console.log(`[SubmissionService] Checking submission status for bounty ${bountyId}`);

      // This would integrate with Superteam API to check status
      // Placeholder implementation
      return {
        status: 'pending',
        message: 'Submission under review',
      };
    } catch (error) {
      throw new Error(`Status check failed: ${error}`);
    }
  }

  /**
   * Track all submissions
   */
  private submissions: Map<string, Submission> = new Map();

  addSubmission(submission: Submission): void {
    this.submissions.set(submission.bountyId, submission);
  }

  getSubmissions(): Submission[] {
    return Array.from(this.submissions.values());
  }

  getSubmissionsByStatus(status: string): Submission[] {
    return Array.from(this.submissions.values()).filter(s => s.status === status);
  }
}

export const submissionService = new SubmissionService();
