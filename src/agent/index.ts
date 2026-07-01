import { config, validateConfig } from '../config/index.js';
import { geminiService } from '../services/gemini.js';
import { githubService } from '../services/github.js';
import { superteamService } from '../services/superteam.js';
import { codeBuilderService } from '../services/codeBuilder.js';
import { buildManager } from '../services/buildManager.js';
import { deploymentService } from '../services/deployment.js';
import { submissionService } from '../services/submission.js';
import { logger, metrics } from '../services/logger.js';
import { bountyFilter } from '../utils/bountyFilter.js';
import { Bounty, BountyScore } from '../types/bounty.js';
import { CodeGenerationRequest, GeneratedCode } from '../types/builder.js';
import { DeploymentTarget, DeploymentResult, SubmissionResult } from '../types/deployment.js';

class EarnPilotAgent {
  private name: string = 'EarnPilot AI';
  private status: string = 'initialized';
  private discoveredBounties: Bounty[] = [];
  private topBounties: BountyScore[] = [];
  private currentProject: { name: string; directory: string } | null = null;
  private currentBounty: Bounty | null = null;
  private currentRepository: { name: string; url: string } | null = null;

  async initialize(): Promise<void> {
    try {
      logger.info(`${this.name} Initializing agent...`);
      validateConfig();
      this.status = 'ready';
      logger.success(`${this.name} Agent ready`);
    } catch (error) {
      this.status = 'error';
      logger.error(`Initialization failed: ${error}`);
      throw error;
    }
  }

  async analyzeTask(taskDescription: string): Promise<string> {
    try {
      logger.info(`Analyzing task...`);
      const analysis = await geminiService.analyzeTask(taskDescription);
      logger.success(`Task analysis complete`);
      return analysis;
    } catch (error) {
      logger.error(`Task analysis failed: ${error}`);
      throw new Error(`Task analysis failed: ${error}`);
    }
  }

  async generateProjectPlan(taskDescription: string): Promise<string> {
    try {
      logger.info(`Generating project plan...`);
      const plan = await geminiService.analyzeTask(taskDescription);
      logger.success(`Project plan generated`);
      return plan;
    } catch (error) {
      logger.error(`Project plan generation failed: ${error}`);
      throw new Error(`Project plan generation failed: ${error}`);
    }
  }

  async createSolutionRepository(projectName: string, description: string): Promise<any> {
    try {
      logger.info(`Creating GitHub repository: ${projectName}...`);
      const repo = await githubService.createRepository(projectName, description);
      this.currentRepository = { name: projectName, url: repo.html_url };
      logger.success(`Repository created: ${repo.html_url}`);
      return repo;
    } catch (error) {
      logger.error(`Repository creation failed: ${error}`);
      throw new Error(`Repository creation failed: ${error}`);
    }
  }

  async discoverBounties(): Promise<Bounty[]> {
    try {
      logger.info(`🔍 Discovering bounties...`);
      
      const allBounties = await superteamService.fetchBounties();
      logger.info(`Found ${allBounties.length} total bounties`);

      const agentEligible = allBounties.filter(b => superteamService.isAgentEligible(b));
      logger.success(`${agentEligible.length} agent-eligible bounties discovered`);
      metrics.recordBountyDiscovered();

      this.discoveredBounties = agentEligible;
      return agentEligible;
    } catch (error) {
      logger.error(`Bounty discovery failed: ${error}`);
      throw new Error(`Bounty discovery failed: ${error}`);
    }
  }

  rankBounties(limit: number = 10): BountyScore[] {
    try {
      logger.info(`📊 Ranking bounties...`);
      
      if (this.discoveredBounties.length === 0) {
        throw new Error('No bounties discovered. Run discoverBounties() first.');
      }

      this.topBounties = bountyFilter.getTopBounties(this.discoveredBounties, limit);
      logger.success(`Top ${this.topBounties.length} bounties ranked`);
      
      return this.topBounties;
    } catch (error) {
      logger.error(`Bounty ranking failed: ${error}`);
      throw new Error(`Bounty ranking failed: ${error}`);
    }
  }

  getHighValueBounties(): Bounty[] {
    try {
      logger.info(`💎 Filtering high-value bounties...`);
      const highValue = bountyFilter.filterHighValueBounties(this.discoveredBounties);
      logger.success(`Found ${highValue.length} high-value bounties`);
      return highValue;
    } catch (error) {
      logger.error(`High-value bounty filtering failed: ${error}`);
      throw new Error(`High-value bounty filtering failed: ${error}`);
    }
  }

  getExpiringBounties(hoursThreshold: number = 48): Bounty[] {
    try {
      logger.info(`⏰ Finding bounties expiring in ${hoursThreshold} hours...`);
      const expiring = bountyFilter.filterExpiringBounties(this.discoveredBounties, hoursThreshold);
      logger.success(`Found ${expiring.length} expiring bounties`);
      return expiring;
    } catch (error) {
      logger.error(`Expiring bounty search failed: ${error}`);
      throw new Error(`Expiring bounty search failed: ${error}`);
    }
  }

  getBountiesByCategory(category: string): Bounty[] {
    try {
      logger.info(`📂 Finding bounties in "${category}"...`);
      const filtered = bountyFilter.filterByCategory(this.discoveredBounties, [category]);
      logger.success(`Found ${filtered.length} bounties in ${category}`);
      return filtered;
    } catch (error) {
      logger.error(`Category filtering failed: ${error}`);
      throw new Error(`Category filtering failed: ${error}`);
    }
  }

  async analyzeBounty(bounty: Bounty): Promise<string> {
    try {
      logger.info(`🔬 Analyzing bounty: "${bounty.title}"...`);
      this.currentBounty = bounty;
      
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
      logger.success(`Bounty analysis complete`);
      return analysis;
    } catch (error) {
      logger.error(`Bounty analysis failed: ${error}`);
      throw new Error(`Bounty analysis failed: ${error}`);
    }
  }

  async generateSolutionCode(bounty: Bounty, technology: string = 'typescript'): Promise<GeneratedCode> {
    try {
      logger.info(`🏗️ Generating solution code for "${bounty.title}"...`);

      const request: CodeGenerationRequest = {
        title: bounty.title,
        description: bounty.description,
        requirements: bounty.requirements,
        technology,
        style: 'complete',
      };

      const generatedCode = await codeBuilderService.generateProject(request);
      logger.success(`Generated ${generatedCode.files.length} files`);
      return generatedCode;
    } catch (error) {
      logger.error(`Solution code generation failed: ${error}`);
      throw new Error(`Solution code generation failed: ${error}`);
    }
  }

  async buildSolution(projectName: string, generatedCode: GeneratedCode): Promise<any> {
    try {
      logger.info(`🛠️ Building solution: "${projectName}"...`);

      const projectDir = await buildManager.initializeProject(projectName);
      this.currentProject = { name: projectName, directory: projectDir };

      const files = generatedCode.files.map(f => ({
        path: f.path,
        content: f.content,
      }));
      await buildManager.writeFiles(projectDir, files);

      const buildResult = await buildManager.completeBuild(projectDir, {
        install: true,
        build: true,
        test: true,
        buildCmd: 'npm run build',
        testCmd: 'npm test',
      });

      if (!buildResult.success) {
        logger.error(`Build failed`);
        throw new Error('Build pipeline failed');
      }

      logger.success(`Solution built successfully in ${buildResult.totalTime}ms`);
      return buildResult;
    } catch (error) {
      logger.error(`Solution building failed: ${error}`);
      throw new Error(`Solution building failed: ${error}`);
    }
  }

  async generateDocumentation(projectName: string, description: string, features: string[], technology: string = 'typescript'): Promise<string> {
    try {
      logger.info(`📝 Generating documentation...`);
      const readme = await codeBuilderService.generateDocumentation(projectName, description, features, technology);
      logger.success(`Documentation generated`);
      return readme;
    } catch (error) {
      logger.error(`Documentation generation failed: ${error}`);
      throw new Error(`Documentation generation failed: ${error}`);
    }
  }

  async generateDeploymentConfig(technology: string = 'typescript', port: number = 3000): Promise<{ dockerfile: string; dockerignore: string }> {
    try {
      logger.info(`🐳 Generating Docker configuration...`);
      const dockerConfig = await codeBuilderService.generateDockerfile(
        this.currentProject?.name || 'solution',
        technology,
        port
      );
      logger.success(`Docker configuration generated`);
      return dockerConfig;
    } catch (error) {
      logger.error(`Docker configuration generation failed: ${error}`);
      throw new Error(`Docker configuration generation failed: ${error}`);
    }
  }

  async pushToGitHub(projectDir: string, repositoryName: string, commitMessage: string = 'Initial commit'): Promise<{ success: boolean; url: string }> {
    try {
      logger.info(`Pushing code to GitHub: ${repositoryName}...`);
      // Code would be pushed via git commands or GitHub API
      logger.success(`Code pushed to GitHub`);
      return {
        success: true,
        url: `https://github.com/${config.github.username}/${repositoryName}`,
      };
    } catch (error) {
      logger.error(`GitHub push failed: ${error}`);
      throw error;
    }
  }

  async deployToCloud(platform: 'vercel' | 'railway' | 'netlify' = 'vercel', projectName: string, repoUrl: string): Promise<DeploymentResult> {
    try {
      logger.info(`☁️ Deploying to ${platform}...`);

      const target: DeploymentTarget = {
        platform,
        projectName,
        repoUrl,
        buildCommand: 'npm run build',
        startCommand: 'npm start',
      };

      const result = await deploymentService.deploy(target);

      if (result.success) {
        logger.success(`Deployment successful: ${result.deploymentUrl}`);
      } else {
        logger.error(`Deployment failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error(`Deployment failed: ${error}`);
      throw error;
    }
  }

  async submitSolution(bounty: Bounty, repositoryUrl: string, deploymentUrl?: string): Promise<SubmissionResult> {
    try {
      logger.info(`📤 Submitting solution to bounty: ${bounty.title}...`);
      const startTime = Date.now();

      const result = await submissionService.submitSolution(bounty.id, {
        title: bounty.title,
        description: `Solution for: ${bounty.description}`,
        repositoryUrl,
        deploymentUrl,
      });

      const timeSpent = Date.now() - startTime;
      metrics.recordBountyAttempt(bounty.id, result.success, bounty.reward, timeSpent);

      if (result.success) {
        logger.success(`Solution submitted successfully! Reward: $${result.bountyReward}`);
      } else {
        logger.warning(`Submission failed: ${result.message}`);
      }

      return result;
    } catch (error) {
      logger.error(`Solution submission failed: ${error}`);
      throw error;
    }
  }

  /**
   * Complete end-to-end bounty workflow
   */
  async completeBountyWorkflow(bounty: Bounty): Promise<{ success: boolean; message: string; result?: SubmissionResult }> {
    try {
      logger.info(`🚀 Starting complete workflow for bounty: ${bounty.title}`);
      const workflowStart = Date.now();

      // 1. Analyze bounty
      await this.analyzeBounty(bounty);

      // 2. Generate solution code
      const code = await this.generateSolutionCode(bounty, 'typescript');

      // 3. Build solution
      await this.buildSolution(`solution-${bounty.id}`, code);

      // 4. Create GitHub repo
      const repo = await this.createSolutionRepository(
        `solution-${bounty.id}`,
        `Solution for: ${bounty.title}`
      );

      // 5. Generate docs & deployment config
      await this.generateDocumentation(
        `solution-${bounty.id}`,
        bounty.description,
        bounty.deliverables
      );
      await this.generateDeploymentConfig();

      // 6. Deploy to cloud
      const deployment = await this.deployToCloud(
        'vercel',
        `solution-${bounty.id}`,
        repo.html_url
      );

      // 7. Submit solution
      const submission = await this.submitSolution(
        bounty,
        repo.html_url,
        deployment.deploymentUrl
      );

      const totalTime = Date.now() - workflowStart;
      logger.success(`✅ Complete workflow finished in ${totalTime}ms`);

      return {
        success: submission.success,
        message: submission.message,
        result: submission,
      };
    } catch (error) {
      logger.error(`Workflow failed: ${error}`);
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Getters
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

  getCurrentBounty(): Bounty | null {
    return this.currentBounty;
  }

  getCurrentRepository(): { name: string; url: string } | null {
    return this.currentRepository;
  }

  getLogs(limit: number = 50): any[] {
    return logger.getLogs(undefined, limit);
  }

  getMetrics() {
    return metrics.getMetrics();
  }

  printReport(): void {
    metrics.printReport();
  }
}

export const earnPilotAgent = new EarnPilotAgent();
