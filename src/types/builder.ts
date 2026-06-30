export interface ProjectTemplate {
  name: string;
  description: string;
  category: string;
  files: TemplateFile[];
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export interface TemplateFile {
  path: string;
  content: string;
  description?: string;
}

export interface CodeGenerationRequest {
  title: string;
  description: string;
  requirements: string[];
  technology: string;
  style?: 'minimal' | 'complete' | 'with-tests';
}

export interface GeneratedCode {
  language: string;
  files: CodeFile[];
  instructions: string;
  dependencies: string[];
}

export interface CodeFile {
  path: string;
  content: string;
  language: string;
}

export interface BuildResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  duration: number; // milliseconds
  output?: string;
}

export interface DeploymentConfig {
  platform: 'vercel' | 'railway' | 'netlify';
  environment: Record<string, string>;
  buildCommand: string;
  startCommand: string;
}
