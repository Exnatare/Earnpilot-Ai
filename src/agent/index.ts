import { config, validateConfig } from '../config/index.js';
import { geminiService } from '../services/gemini.js';
import { githubService } from '../services/github.js';
import { superteamService } from '../services/superteam.js';
import { codeBuilderService } from '../services/codeBuilder.js';
import { buildManager } from '../services/buildManager.js';
import { bountyFilter } from '../utils/bountyFilter.js';
import { Bounty, BountyScore } from '../types/bounty.js';
import { CodeGenerationRequest, GeneratedCode } from '../types/builder.js';

class EarnPilotAgent {
  private name: string = 'EarnPilot AI';
  private status: string = 'initialized';
  private discoveredBounties: Bounty[] = [];
  private topBounties: BountyScore[] = [];
  private currentProject: { name: string; directory: string } | null = null;

  async initialize(): Promise<void> {
    try {
      console.log(`[${this.name}] Initializing agent...`);
      validateConfig();
      this.status = 'ready';
      console.log(`[${this.name}] ✓ Agent ready`);
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  async analyzeTask(taskDescription: string): Promise<string> {
    try {
      console.log(`[${this.name}] Analyzing task...`);
      const analysis = await geminiService.analyzeTask(taskDescription);
      console.log(`[${this.name}] ✓ Task analysis complete`);
      return analysis;
    } catch (error) {
      throw new Error(`Task analysis failed: ${error}`);
    }
  }

  async generateProjectPlan(taskDescription: string): Promise<string> {
    try {
      console.log(`[${this.name}] Generating project plan...`);
      const plan = await geminiService.analyzeTask(taskDescription);
      console.log(`[${this.name}] ✓ Project plan generated`);
      return plan;
    } catch (error) {
      throw new Error(`Project plan generation failed: ${error}`);
    }
  }

  async createSolutionRepository(projectName: string, description: string): Promise<any> {
    try {
      console.log(`[${this.name}] Creating GitHub repository...`);
      const repo = await githubService.createRepository(projectName, description);
      console.log(`[${this.name}] ✓ Repository created: ${repo.html_url}`);
      return repo;
    } catch (error) {
      throw new Error(`Repository creation failed: ${error}`);
    }
  }

  /**
   * Discover available bounties on Superteam Earn
   */
  async discoverBounties(): Promise<Bounty[]> {
    try {
      console.log(`[${this.name}] 🔍 Discovering bounties...`);
      
      const allBounties = await superteamService.fetchBounties();
      console.log(`[${this.name}] Found ${allBounties.length} total bounties`);

      const agentEligible = allBounties.filter(b => superteamService.isAgentEligible(b));
      console.log(`[${this.name}] ✓ ${agentEligible.length} agent-eligible bounties`);

      this.discoveredBounties = agentEligible;
      return agentEligible;
    } catch (error) {
      throw new Error(`Bounty discovery failed: ${error}`);
    }
  }

  /**
   * Rank discovered bounties by score
   */
  rankBounties(limit: number = 10): BountyScore[] {
    try {
      console.log(`[${this.name}] 📊 Ranking bounties...`);
      
      if (this.discoveredBounties.length === 0) {
        throw new Error('No bounties discovered. Run discoverBounties() first.');
      }

      this.topBounties = bountyFilter.getTopBounties(this.discoveredBounties, limit);
      console.log(`[${this.name}] ✓ Top ${this.topBounties.length} bounties ranked`);
      
      return this.topBounties;
    } catch (error) {
      throw new Error(`Bounty ranking failed: ${error}`);
    }
  }

  /**
   * Get high-value bounties
   */
  getHighValueBounties(): Bounty[] {
    try {
      console.log(`[${this.name}] 💎 Filtering high-value bounties...`);
      const highValue = bountyFilter.filterHighValueBounties(this.discoveredBounties);
      console.log(`[${this.name}] ✓ Found ${highValue.length} high-value bounties`);
      return highValue;
    } catch (error) {
      throw new Error(`High-value bounty filtering failed: ${error}`);
    }
  }

  /**
   * Get bounties expiring soon
   */
  getExpiringBounties(hoursThreshold: number = 48): Bounty[] {
    try {
      console.log(`[${this.name}] ⏰ Finding bounties expiring in ${hoursThreshold} hours...`);
      const expiring = bountyFilter.filterExpiringBounties(this.discoveredBounties, hoursThreshold);
      console.log(`[${this.name}] ✓ Found ${expiring.length} expiring bounties`);
      return expiring;
    } catch (error) {
      throw new Error(`Expiring bounty search failed: ${error}`);
    }
  }

  /**
   * Get bounties by category
   */
  getBountiesByCategory(category: string): Bounty[] {
    try {
      console.log(`[${this.name}] 📂 Finding bounties in "${category}"...`);
      const filtered = bountyFilter.filterByCategory(this.discoveredBounties, [category]);
      console.log(`[${this.name}] ✓ Found ${filtered.length} bounties in ${category}`);
      return filtered;
    } catch (error) {
      throw new Error(`Category filtering failed: ${error}`);
    }
  }

  /**
   * Get detailed analysis of a specific bounty
   */
  async analyzeBounty(bounty: Bounty): Promise<string> {
    try {
      console.log(`[${this.name}] 🔬 Analyzing bounty: "${bounty.title}"...`);
      
      const prompt = `
Analyze this bounty opportunity for an AI agent to complete:

Title: ${bounty.title}
Reward: ${bounty.reward} ${bounty.rewardCurrency}
Difficulty: ${bounty.difficulty}
Deadline: ${bounty.deadline}

Description: ${bounty.description}

Requirements:
${bounty.requirements.map(r => `- ${r}`).join('\n')}

Deliverables:
${bounty.deliverables.map(d => `- ${d}`).join('\n')}

Provide:
1. Feasibility assessment
2. Technical approach
3. Estimated effort (hours)
4. Risk analysis
5. Success probability (0-100%)
      `;

      const analysis = await geminiService.analyzeTask(prompt);
      console.log(`[${this.name}] ✓ Bounty analysis complete`);
      return analysis;
    } catch (error) {
      throw new Error(`Bounty analysis failed: ${error}`);
    }
  }

  /**
   * Generate complete project code from bounty
   */
  async generateSolutionCode(bounty: Bounty, technology: string = 'typescript'): Promise<GeneratedCode> {
    try {
      console.log(`[${this.name}] 🏗️ Generating solution code for "${bounty.title}"...`);

      const request: CodeGenerationRequest = {
        title: bounty.title,
        description: bounty.description,
        requirements: bounty.requirements,
        technology,
        style: 'complete',
      };

      const generatedCode = await codeBuilderService.generateProject(request);
      console.log(`[${this.name}] ✓ Generated ${generatedCode.files.length} files`);
      return generatedCode;
    } catch (error) {
      throw new Error(`Solution code generation failed: ${error}`);
    }
  }

  /**
   * Create and build a solution project
   */
  async buildSolution(projectName: string, generatedCode: GeneratedCode): Promise<any> {
    try {
      console.log(`[${this.name}] 🛠️ Building solution: "${projectName}"...`);

      // Initialize project directory
      const projectDir = await buildManager.initializeProject(projectName);
      this.currentProject = { name: projectName, directory: projectDir };

      // Write generated files
      const files = generatedCode.files.map(f => ({
        path: f.path,
        content: f.content,
      }));
      await buildManager.writeFiles(projectDir, files);

      // Complete build pipeline
      const buildResult = await buildManager.completeBuild(projectDir, {
        install: true,
        build: true,
        test: true,
        buildCmd: 'npm run build',
        testCmd: 'npm test',
      });

      if (!buildResult.success) {
        console.error(`[${this.name}] ✗ Build failed`);
        throw new Error('Build pipeline failed');
      }

      console.log(`[${this.name}] ✓ Solution built successfully in ${buildResult.totalTime}ms`);
      return buildResult;
    } catch (error) {
      throw new Error(`Solution building failed: ${error}`);
    }
  }

  /**
   * Generate documentation for solution
   */
  async generateDocumentation(projectName: string, description: string, features: string[], technology: string = 'typescript'): Promise<string> {
    try {
      console.log(`[${this.name}] 📝 Generating documentation...`);
      const readme = await codeBuilderService.generateDocumentation(projectName, description, features, technology);
      console.log(`[${this.name}] ✓ Documentation generated`);
      return readme;
    } catch (error) {
      throw new Error(`Documentation generation failed: ${error}`);
    }
  }

  /**
   * Generate Dockerfile for solution
   */
  async generateDeploymentConfig(technology: string = 'typescript', port: number = 3000): Promise<{ dockerfile: string; dockerignore: string }> {
    try {
      console.log(`[${this.name}] 🐳 Generating Docker configuration...`);
      const dockerConfig = await codeBuilderService.generateDockerfile(
        this.currentProject?.name || 'solution',
        technology,
        port
      );
      console.log(`[${this.name}] ✓ Docker configuration generated`);
      return dockerConfig;
    } catch (error) {
      throw new Error(`Docker configuration generation failed: ${error}`);
    }
  }

  getStatus(): string {
    return this.status;
  }

  getName(): string {
    return this.name;
  }

  getDiscoveredBountiesCount(): number {
    return this.discoveredBounties.length;
  }

  getTopBountiesCount(): number {
    return this.topBounties.length;
  }

  getCurrentProject(): { name: string; directory: string } | null {
    return this.currentProject;
  }
}

export const earnPilotAgent = new EarnPilotAgent();
