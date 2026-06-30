import { geminiService } from './gemini.js';
import { CodeGenerationRequest, GeneratedCode, CodeFile } from '../types/builder.js';

class CodeBuilderService {
  /**
   * Generate complete project code from requirements
   */
  async generateProject(request: CodeGenerationRequest): Promise<GeneratedCode> {
    try {
      console.log(`[CodeBuilder] Generating ${request.technology} project: "${request.title}"`);

      const prompt = `
You are an expert software developer. Generate a complete, production-ready ${request.technology} project.

Project Title: ${request.title}
Description: ${request.description}

Requirements:
${request.requirements.map(r => `- ${r}`).join('\n')}

Style: ${request.style || 'complete'}

Provide a complete project structure with:
1. Package/dependency management file (package.json, requirements.txt, Cargo.toml, etc.)
2. Main application file(s)
3. Configuration files
4. Build/setup instructions
5. Environment variables needed

Format your response as:

FILE_START: [path/to/file]
FILE_LANGUAGE: [language]
[file content]
FILE_END

Provide at least 3-5 files for a complete project.
      `;

      const response = await geminiService.analyzeTask(prompt);
      const files = this.parseGeneratedFiles(response, request.technology);

      console.log(`[CodeBuilder] ✓ Generated ${files.length} files`);
      return {
        language: request.technology,
        files,
        instructions: this.extractInstructions(response),
        dependencies: this.extractDependencies(response),
      };
    } catch (error) {
      throw new Error(`Code generation failed: ${error}`);
    }
  }

  /**
   * Generate individual component/file code
   */
  async generateComponent(componentName: string, purpose: string, technology: string): Promise<string> {
    try {
      console.log(`[CodeBuilder] Generating ${technology} component: ${componentName}`);

      const prompt = `
Generate a production-ready ${technology} component/module.

Component Name: ${componentName}
Purpose: ${purpose}

Requirements:
- Well-documented code with JSDoc/docstrings
- Error handling
- Type hints/types where applicable
- Follows best practices for ${technology}
- Modular and reusable

Provide only the code, no explanations.
      `;

      const code = await geminiService.analyzeTask(prompt);
      console.log(`[CodeBuilder] ✓ Component generated`);
      return code;
    } catch (error) {
      throw new Error(`Component generation failed: ${error}`);
    }
  }

  /**
   * Generate unit tests for code
   */
  async generateTests(code: string, language: string): Promise<string> {
    try {
      console.log(`[CodeBuilder] Generating tests for ${language} code`);

      const prompt = `
Generate comprehensive unit tests for this ${language} code.

Code:
\`\`\`${language}
${code}
\`\`\`

Tests should:
- Cover all functions/methods
- Test happy path and edge cases
- Use appropriate testing framework for ${language}
- Be well-documented
- Mock external dependencies

Provide only the test code.
      `;

      const tests = await geminiService.analyzeTask(prompt);
      console.log(`[CodeBuilder] ✓ Tests generated`);
      return tests;
    } catch (error) {
      throw new Error(`Test generation failed: ${error}`);
    }
  }

  /**
   * Generate README/documentation
   */
  async generateDocumentation(projectName: string, description: string, features: string[], technology: string): Promise<string> {
    try {
      console.log(`[CodeBuilder] Generating README for ${projectName}`);

      const prompt = `
Generate a professional, comprehensive README.md for a ${technology} project.

Project Name: ${projectName}
Description: ${description}

Features:
${features.map(f => `- ${f}`).join('\n')}

Include sections for:
1. Overview
2. Features
3. Prerequisites
4. Installation
5. Usage
6. Configuration
7. API Reference (if applicable)
8. Development
9. Deployment
10. License

Make it professional and well-formatted in Markdown.
      `;

      const readme = await geminiService.analyzeTask(prompt);
      console.log(`[CodeBuilder] ✓ README generated`);
      return readme;
    } catch (error) {
      throw new Error(`Documentation generation failed: ${error}`);
    }
  }

  /**
   * Generate Docker configuration
   */
  async generateDockerfile(projectName: string, technology: string, port: number = 3000): Promise<{ dockerfile: string; dockerignore: string }> {
    try {
      console.log(`[CodeBuilder] Generating Dockerfile for ${projectName}`);

      const prompt = `
Generate a production-ready Dockerfile for a ${technology} application.

Project: ${projectName}
Port: ${port}

Requirements:
- Use appropriate base image for ${technology}
- Minimize image size (use multi-stage if needed)
- Include security best practices
- Run as non-root user
- Expose port ${port}
- Include health check

Also generate a .dockerignore file.

Format your response as:
DOCKERFILE:
[dockerfile content]

DOCKERIGNORE:
[dockerignore content]
      `;

      const response = await geminiService.analyzeTask(prompt);
      const [dockerfilePart, dockerignorePart] = response.split('DOCKERIGNORE:');

      console.log(`[CodeBuilder] ✓ Dockerfile generated`);
      return {
        dockerfile: dockerfilePart.replace('DOCKERFILE:', '').trim(),
        dockerignore: dockerignorePart.trim(),
      };
    } catch (error) {
      throw new Error(`Dockerfile generation failed: ${error}`);
    }
  }

  /**
   * Generate deployment configuration
   */
  async generateDeploymentConfig(projectName: string, platform: 'vercel' | 'railway' | 'netlify'): Promise<string> {
    try {
      console.log(`[CodeBuilder] Generating ${platform} config for ${projectName}`);

      let configTemplate = '';
      let filename = '';

      if (platform === 'vercel') {
        filename = 'vercel.json';
        configTemplate = `
Generate a vercel.json configuration for deploying a ${projectName} to Vercel.

Include:
- Build settings
- Environment variables section
- Functions (if serverless)
- Redirects
- Headers
- Regions (use us-east-1)
        `;
      } else if (platform === 'railway') {
        filename = 'railway.json';
        configTemplate = `
Generate a railway.json configuration for deploying ${projectName} to Railway.

Include:
- Build command
- Start command
- Port configuration
- Environment variables
        `;
      } else if (platform === 'netlify') {
        filename = 'netlify.toml';
        configTemplate = `
Generate a netlify.toml configuration for deploying ${projectName} to Netlify.

Include:
- Build settings
- Environment variables
- Functions
- Redirects
        `;
      }

      const config = await geminiService.analyzeTask(configTemplate);
      console.log(`[CodeBuilder] ✓ ${platform} config generated`);
      return config;
    } catch (error) {
      throw new Error(`Deployment config generation failed: ${error}`);
    }
  }

  /**
   * Parse generated files from AI response
   */
  private parseGeneratedFiles(response: string, language: string): CodeFile[] {
    const files: CodeFile[] = [];
    const fileRegex = /FILE_START:\s*(.+?)\nFILE_LANGUAGE:\s*(.+?)\n([\s\S]*?)FILE_END/g;
    let match;

    while ((match = fileRegex.exec(response)) !== null) {
      files.push({
        path: match[1].trim(),
        language: match[2].trim(),
        content: match[3].trim(),
      });
    }

    // Fallback: if no files found, assume entire response is code
    if (files.length === 0) {
      files.push({
        path: `main.${this.getFileExtension(language)}`,
        language,
        content: response,
      });
    }

    return files;
  }

  /**
   * Extract setup instructions from response
   */
  private extractInstructions(response: string): string {
    const lines = response.split('\n');
    const instructionStart = lines.findIndex(l => l.toLowerCase().includes('instruction') || l.toLowerCase().includes('setup'));

    if (instructionStart !== -1) {
      return lines.slice(instructionStart).join('\n');
    }

    return 'See generated files for setup instructions.';
  }

  /**
   * Extract dependencies from response
   */
  private extractDependencies(response: string): string[] {
    const deps: string[] = [];
    const depPatterns = [
      /npm\s+install\s+([\w@/-]+)/g,
      /yarn\s+add\s+([\w@/-]+)/g,
      /pip\s+install\s+([\w-]+)/g,
      /cargo\s+add\s+([\w-]+)/g,
    ];

    for (const pattern of depPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        if (!deps.includes(match[1])) {
          deps.push(match[1]);
        }
      }
    }

    return deps;
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      'typescript': 'ts',
      'javascript': 'js',
      'python': 'py',
      'go': 'go',
      'rust': 'rs',
      'java': 'java',
      'csharp': 'cs',
      'ruby': 'rb',
      'php': 'php',
    };
    return extensions[language.toLowerCase()] || 'txt';
  }
}

export const codeBuilderService = new CodeBuilderService();
