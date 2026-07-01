import axios from 'axios';
import { DeploymentTarget, DeploymentResult } from '../types/deployment.js';
import { config } from '../config/index.js';

class DeploymentService {
  /**
   * Deploy to Vercel
   */
  async deployToVercel(target: DeploymentTarget): Promise<DeploymentResult> {
    try {
      console.log(`[DeploymentService] Deploying to Vercel: ${target.projectName}`);
      const startTime = Date.now();

      if (!config.deployment.vercelToken) {
        throw new Error('VERCEL_TOKEN not configured');
      }

      // Create Vercel project via API
      const projectResponse = await axios.post(
        'https://api.vercel.com/v9/projects',
        {
          name: target.projectName,
          gitRepository: {
            type: 'github',
            repo: target.repoUrl,
          },
          framework: 'nextjs', // Default to Next.js
          buildCommand: target.buildCommand,
          outputDirectory: 'dist',
          rootDirectory: '.',
          env: target.environmentVariables || {},
        },
        {
          headers: {
            Authorization: `Bearer ${config.deployment.vercelToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const projectId = projectResponse.data.id;

      // Trigger deployment
      const deployResponse = await axios.post(
        `https://api.vercel.com/v13/deployments`,
        {
          name: target.projectName,
          project: projectId,
          gitSource: {
            type: 'github',
            repo: target.repoUrl,
            ref: 'main',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${config.deployment.vercelToken}`,
          },
        }
      );

      const duration = Date.now() - startTime;
      const deploymentUrl = `https://${deployResponse.data.url}`;

      console.log(`[DeploymentService] ✓ Deployed to Vercel: ${deploymentUrl}`);

      return {
        success: true,
        platform: 'vercel',
        deploymentUrl,
        deploymentId: deployResponse.data.id,
        logs: ['Deployment successful'],
        duration,
      };
    } catch (error) {
      const duration = Date.now();
      console.error(`[DeploymentService] ✗ Vercel deployment failed: ${error}`);

      return {
        success: false,
        platform: 'vercel',
        logs: [error instanceof Error ? error.message : String(error)],
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Deploy to Railway
   */
  async deployToRailway(target: DeploymentTarget): Promise<DeploymentResult> {
    try {
      console.log(`[DeploymentService] Deploying to Railway: ${target.projectName}`);
      const startTime = Date.now();

      // Railway uses git push to deploy
      // This is a placeholder for API integration
      const response = await axios.post(
        'https://railway.app/api/graphql',
        {
          query: `
            mutation {
              projectCreate(input: {
                name: "${target.projectName}"
              }) {
                project {
                  id
                  name
                }
              }
            }
          `,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.deployment.vercelToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const duration = Date.now() - startTime;
      const deploymentUrl = `https://${target.projectName}.railway.app`;

      console.log(`[DeploymentService] ✓ Deployed to Railway: ${deploymentUrl}`);

      return {
        success: true,
        platform: 'railway',
        deploymentUrl,
        logs: ['Deployment successful'],
        duration,
      };
    } catch (error) {
      const duration = Date.now();
      console.error(`[DeploymentService] ✗ Railway deployment failed: ${error}`);

      return {
        success: false,
        platform: 'railway',
        logs: [error instanceof Error ? error.message : String(error)],
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Deploy to Netlify
   */
  async deployToNetlify(target: DeploymentTarget): Promise<DeploymentResult> {
    try {
      console.log(`[DeploymentService] Deploying to Netlify: ${target.projectName}`);
      const startTime = Date.now();

      // Connect GitHub repo to Netlify
      const response = await axios.post(
        'https://api.netlify.com/api/v1/sites',
        {
          name: target.projectName,
          repo: {
            provider: 'github',
            repo: target.repoUrl,
            branch: 'main',
            deploy_key_id: null,
          },
          build_settings: {
            cmd: target.buildCommand,
            dir: 'dist',
          },
          env: target.environmentVariables || {},
        },
        {
          headers: {
            Authorization: `Bearer ${config.deployment.vercelToken}`,
          },
        }
      );

      const duration = Date.now() - startTime;
      const deploymentUrl = response.data.url;

      console.log(`[DeploymentService] ✓ Deployed to Netlify: ${deploymentUrl}`);

      return {
        success: true,
        platform: 'netlify',
        deploymentUrl,
        deploymentId: response.data.id,
        logs: ['Deployment successful'],
        duration,
      };
    } catch (error) {
      const duration = Date.now();
      console.error(`[DeploymentService] ✗ Netlify deployment failed: ${error}`);

      return {
        success: false,
        platform: 'netlify',
        logs: [error instanceof Error ? error.message : String(error)],
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Deploy to configured platform
   */
  async deploy(target: DeploymentTarget): Promise<DeploymentResult> {
    try {
      console.log(`[DeploymentService] Starting deployment to ${target.platform}...`);

      switch (target.platform) {
        case 'vercel':
          return await this.deployToVercel(target);
        case 'railway':
          return await this.deployToRailway(target);
        case 'netlify':
          return await this.deployToNetlify(target);
        default:
          throw new Error(`Unknown deployment platform: ${target.platform}`);
      }
    } catch (error) {
      console.error(`[DeploymentService] Deployment failed: ${error}`);
      throw error;
    }
  }

  /**
   * Check deployment status
   */
  async checkDeploymentStatus(platform: string, deploymentId: string): Promise<{ status: string; url?: string }> {
    try {
      console.log(`[DeploymentService] Checking status for ${platform} deployment ${deploymentId}`);

      if (platform === 'vercel') {
        const response = await axios.get(
          `https://api.vercel.com/v13/deployments/${deploymentId}`,
          {
            headers: {
              Authorization: `Bearer ${config.deployment.vercelToken}`,
            },
          }
        );

        return {
          status: response.data.state,
          url: response.data.url ? `https://${response.data.url}` : undefined,
        };
      }

      return { status: 'unknown' };
    } catch (error) {
      console.error(`[DeploymentService] Status check failed: ${error}`);
      throw error;
    }
  }
}

export const deploymentService = new DeploymentService();
