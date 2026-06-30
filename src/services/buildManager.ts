import { execSync, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { BuildResult } from '../types/builder.js';

class BuildManager {
  private projectPath: string;

  constructor(projectPath: string = './') {
    this.projectPath = projectPath;
  }

  /**
   * Initialize a new project directory
   */
  async initializeProject(projectName: string, template: string = 'basic'): Promise<string> {
    try {
      console.log(`[BuildManager] Initializing project: ${projectName}`);
      const projectDir = path.join(this.projectPath, projectName);

      // Create directory
      await fs.mkdir(projectDir, { recursive: true });
      console.log(`[BuildManager] ✓ Created directory: ${projectDir}`);

      return projectDir;
    } catch (error) {
      throw new Error(`Project initialization failed: ${error}`);
    }
  }

  /**
   * Write files to disk
   */
  async writeFiles(projectDir: string, files: { path: string; content: string }[]): Promise<void> {
    try {
      console.log(`[BuildManager] Writing ${files.length} files...`);

      for (const file of files) {
        const filePath = path.join(projectDir, file.path);
        const fileDir = path.dirname(filePath);

        // Ensure directory exists
        await fs.mkdir(fileDir, { recursive: true });
        // Write file
        await fs.writeFile(filePath, file.content, 'utf-8');
      }

      console.log(`[BuildManager] ✓ All files written`);
    } catch (error) {
      throw new Error(`File writing failed: ${error}`);
    }
  }

  /**
   * Install dependencies
   */
  async installDependencies(projectDir: string, packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'): Promise<BuildResult> {
    try {
      console.log(`[BuildManager] Installing dependencies with ${packageManager}...`);
      const startTime = Date.now();

      try {
        const output = execSync(
          packageManager === 'npm' ? 'npm install' :
          packageManager === 'yarn' ? 'yarn install' :
          'pnpm install',
          {
            cwd: projectDir,
            encoding: 'utf-8',
            stdio: 'pipe',
          }
        );

        const duration = Date.now() - startTime;
        console.log(`[BuildManager] ✓ Dependencies installed in ${duration}ms`);

        return {
          success: true,
          errors: [],
          warnings: [],
          duration,
          output,
        };
      } catch (error: any) {
        throw new Error(error.message || 'Dependency installation failed');
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        duration: 0,
      };
    }
  }

  /**
   * Build the project
   */
  async build(projectDir: string, buildCommand: string = 'npm run build'): Promise<BuildResult> {
    try {
      console.log(`[BuildManager] Building project...`);
      const startTime = Date.now();

      try {
        const output = execSync(buildCommand, {
          cwd: projectDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        const duration = Date.now() - startTime;
        console.log(`[BuildManager] ✓ Build successful in ${duration}ms`);

        return {
          success: true,
          errors: [],
          warnings: [],
          duration,
          output,
        };
      } catch (error: any) {
        throw new Error(error.message || 'Build failed');
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        duration: 0,
      };
    }
  }

  /**
   * Run tests
   */
  async runTests(projectDir: string, testCommand: string = 'npm test'): Promise<BuildResult> {
    try {
      console.log(`[BuildManager] Running tests...`);
      const startTime = Date.now();

      try {
        const output = execSync(testCommand, {
          cwd: projectDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        const duration = Date.now() - startTime;
        console.log(`[BuildManager] ✓ Tests passed in ${duration}ms`);

        return {
          success: true,
          errors: [],
          warnings: [],
          duration,
          output,
        };
      } catch (error: any) {
        throw new Error(error.message || 'Tests failed');
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        duration: 0,
      };
    }
  }

  /**
   * Lint the project
   */
  async lint(projectDir: string, lintCommand: string = 'npm run lint'): Promise<BuildResult> {
    try {
      console.log(`[BuildManager] Linting project...`);
      const startTime = Date.now();

      try {
        const output = execSync(lintCommand, {
          cwd: projectDir,
          encoding: 'utf-8',
          stdio: 'pipe',
        });

        const duration = Date.now() - startTime;
        console.log(`[BuildManager] ✓ Linting passed in ${duration}ms`);

        return {
          success: true,
          errors: [],
          warnings: [],
          duration,
          output,
        };
      } catch (error: any) {
        throw new Error(error.message || 'Linting failed');
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        duration: 0,
      };
    }
  }

  /**
   * Complete build pipeline
   */
  async completeBuild(
    projectDir: string,
    options: {
      install?: boolean;
      lint?: boolean;
      build?: boolean;
      test?: boolean;
      installCmd?: string;
      lintCmd?: string;
      buildCmd?: string;
      testCmd?: string;
    } = {}
  ): Promise<{ results: BuildResult[]; success: boolean; totalTime: number }> {
    try {
      console.log(`[BuildManager] Starting complete build pipeline...`);
      const startTime = Date.now();
      const results: BuildResult[] = [];

      // Step 1: Install
      if (options.install !== false) {
        const installResult = await this.installDependencies(
          projectDir,
          'npm'
        );
        results.push(installResult);
        if (!installResult.success) {
          console.error('[BuildManager] ✗ Installation failed, stopping pipeline');
          return {
            results,
            success: false,
            totalTime: Date.now() - startTime,
          };
        }
      }

      // Step 2: Lint
      if (options.lint !== false && options.lintCmd) {
        const lintResult = await this.lint(projectDir, options.lintCmd);
        results.push(lintResult);
        if (!lintResult.success) {
          console.warn('[BuildManager] ⚠ Linting failed, but continuing...');
        }
      }

      // Step 3: Build
      if (options.build !== false && options.buildCmd) {
        const buildResult = await this.build(projectDir, options.buildCmd);
        results.push(buildResult);
        if (!buildResult.success) {
          console.error('[BuildManager] ✗ Build failed, stopping pipeline');
          return {
            results,
            success: false,
            totalTime: Date.now() - startTime,
          };
        }
      }

      // Step 4: Test
      if (options.test !== false && options.testCmd) {
        const testResult = await this.runTests(projectDir, options.testCmd);
        results.push(testResult);
        if (!testResult.success) {
          console.warn('[BuildManager] ⚠ Tests failed, but continuing...');
        }
      }

      const totalTime = Date.now() - startTime;
      console.log(`[BuildManager] ✓ Build pipeline complete in ${totalTime}ms`);

      return {
        results,
        success: true,
        totalTime,
      };
    } catch (error) {
      throw new Error(`Build pipeline failed: ${error}`);
    }
  }

  /**
   * Clean up build artifacts
   */
  async clean(projectDir: string, targets: string[] = ['dist', 'build', '.next', 'node_modules']): Promise<void> {
    try {
      console.log(`[BuildManager] Cleaning build artifacts...`);

      for (const target of targets) {
        const targetPath = path.join(projectDir, target);
        try {
          await fs.rm(targetPath, { recursive: true, force: true });
          console.log(`[BuildManager] ✓ Cleaned: ${target}`);
        } catch (e) {
          // Silently skip if target doesn't exist
        }
      }
    } catch (error) {
      throw new Error(`Clean failed: ${error}`);
    }
  }
}

export const buildManager = new BuildManager();
