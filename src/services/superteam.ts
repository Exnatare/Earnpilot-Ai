import axios from 'axios';
import { config } from '../config/index.js';
import { Bounty, Hackathon, SuperteamResponse } from '../types/bounty.js';

class SuperteamService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.superteam.baseUrl;
    this.apiKey = config.superteam.apiKey;
  }

  /**
   * Fetch all active bounties from Superteam Earn
   */
  async fetchBounties(): Promise<Bounty[]> {
    try {
      console.log('[SuperteamService] Fetching bounties...');
      
      // Using public Superteam API endpoint (no auth required for public data)
      const response = await axios.get(`${this.baseUrl}/bounties`, {
        params: {
          status: 'Open',
          limit: 100,
          offset: 0,
        },
        headers: this.getHeaders(),
      });

      const bounties = response.data.data || [];
      console.log(`[SuperteamService] ✓ Fetched ${bounties.length} bounties`);
      return bounties;
    } catch (error) {
      throw new Error(`Failed to fetch bounties: ${error}`);
    }
  }

  /**
   * Fetch all active hackathons
   */
  async fetchHackathons(): Promise<Hackathon[]> {
    try {
      console.log('[SuperteamService] Fetching hackathons...');
      
      const response = await axios.get(`${this.baseUrl}/hackathons`, {
        params: {
          status: 'Active',
          limit: 50,
        },
        headers: this.getHeaders(),
      });

      const hackathons = response.data.data || [];
      console.log(`[SuperteamService] ✓ Fetched ${hackathons.length} hackathons`);
      return hackathons;
    } catch (error) {
      throw new Error(`Failed to fetch hackathons: ${error}`);
    }
  }

  /**
   * Get bounty details by ID
   */
  async getBountyDetails(bountyId: string): Promise<Bounty> {
    try {
      console.log(`[SuperteamService] Fetching details for bounty ${bountyId}...`);
      
      const response = await axios.get(`${this.baseUrl}/bounties/${bountyId}`, {
        headers: this.getHeaders(),
      });

      return response.data.data;
    } catch (error) {
      throw new Error(`Failed to fetch bounty details: ${error}`);
    }
  }

  /**
   * Submit a solution to a bounty
   */
  async submitSolution(bountyId: string, submission: {
    title: string;
    description: string;
    githubUrl: string;
    deploymentUrl?: string;
  }): Promise<any> {
    try {
      console.log(`[SuperteamService] Submitting solution to bounty ${bountyId}...`);
      
      const response = await axios.post(
        `${this.baseUrl}/bounties/${bountyId}/submit`,
        submission,
        { headers: this.getHeaders() }
      );

      console.log(`[SuperteamService] ✓ Solution submitted`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to submit solution: ${error}`);
    }
  }

  /**
   * Search bounties by keywords
   */
  async searchBounties(query: string): Promise<Bounty[]> {
    try {
      console.log(`[SuperteamService] Searching bounties for "${query}"...`);
      
      const response = await axios.get(`${this.baseUrl}/bounties/search`, {
        params: {
          q: query,
          limit: 50,
        },
        headers: this.getHeaders(),
      });

      return response.data.data || [];
    } catch (error) {
      throw new Error(`Failed to search bounties: ${error}`);
    }
  }

  /**
   * Get bounties by category
   */
  async getBountiesByCategory(category: string): Promise<Bounty[]> {
    try {
      console.log(`[SuperteamService] Fetching bounties in category "${category}"...`);
      
      const response = await axios.get(`${this.baseUrl}/bounties`, {
        params: {
          category,
          status: 'Open',
          limit: 100,
        },
        headers: this.getHeaders(),
      });

      return response.data.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch bounties by category: ${error}`);
    }
  }

  /**
   * Check if bounty is agent-eligible
   */
  isAgentEligible(bounty: Bounty): boolean {
    // Agent can work on bounties that:
    // 1. Have clear requirements
    // 2. Don't require specific domain knowledge (e.g., legal expertise)
    // 3. Have reasonable deadlines (at least 24 hours)
    // 4. Are development/technical focused

    const nonAgentFriendlyKeywords = [
      'legal',
      'financial advice',
      'medical',
      'consulting',
      'design only',
      'idea only',
    ];

    const isNonFriendly = nonAgentFriendlyKeywords.some(keyword =>
      bounty.title.toLowerCase().includes(keyword) ||
      bounty.description.toLowerCase().includes(keyword)
    );

    if (isNonFriendly) return false;

    // Must have requirements and deliverables
    if (!bounty.requirements || bounty.requirements.length === 0) return false;
    if (!bounty.deliverables || bounty.deliverables.length === 0) return false;

    // Must have reasonable deadline
    const deadline = new Date(bounty.deadline);
    const hoursUntilDeadline = (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDeadline < 24) return false;

    return true;
  }

  /**
   * Private helper to get request headers
   */
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
    };
  }
}

export const superteamService = new SuperteamService();
