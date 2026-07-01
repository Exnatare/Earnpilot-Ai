import { AgentLog, AgentMetrics } from '../types/deployment.js';

class Logger {
  private logs: AgentLog[] = [];
  private maxLogs: number = 10000;

  info(message: string, context?: Record<string, any>): void {
    this.addLog('info', message, context);
    console.log(`[INFO] ${message}`, context ? JSON.stringify(context) : '');
  }

  success(message: string, context?: Record<string, any>): void {
    this.addLog('success', message, context);
    console.log(`[✓] ${message}`, context ? JSON.stringify(context) : '');
  }

  warning(message: string, context?: Record<string, any>): void {
    this.addLog('warning', message, context);
    console.warn(`[⚠] ${message}`, context ? JSON.stringify(context) : '');
  }

  error(message: string, context?: Record<string, any>): void {
    this.addLog('error', message, context);
    console.error(`[✗] ${message}`, context ? JSON.stringify(context) : '');
  }

  private addLog(level: 'info' | 'success' | 'warning' | 'error', message: string, context?: Record<string, any>): void {
    const log: AgentLog = {
      timestamp: new Date(),
      level,
      message,
      context,
    };

    this.logs.push(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(level?: string, limit: number = 100): AgentLog[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter(l => l.level === level);
    }
    return filtered.slice(-limit);
  }

  getAllLogs(): AgentLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    // CSV format
    const headers = ['Timestamp', 'Level', 'Message'];
    const rows = this.logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.message,
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }
}

class Metrics {
  private startTime: Date = new Date();
  private data: {
    totalBountiesDiscovered: number;
    totalBountiesAttempted: number;
    totalSuccessfulSubmissions: number;
    totalRewardEarned: number;
    bountyAttempts: Map<string, { time: number; success: boolean; reward: number }>;
  } = {
    totalBountiesDiscovered: 0,
    totalBountiesAttempted: 0,
    totalSuccessfulSubmissions: 0,
    totalRewardEarned: 0,
    bountyAttempts: new Map(),
  };

  recordBountyDiscovered(): void {
    this.data.totalBountiesDiscovered++;
  }

  recordBountyAttempt(bountyId: string, success: boolean, reward: number = 0, timeSpent: number = 0): void {
    this.data.totalBountiesAttempted++;
    if (success) {
      this.data.totalSuccessfulSubmissions++;
      this.data.totalRewardEarned += reward;
    }
    this.data.bountyAttempts.set(bountyId, {
      time: timeSpent,
      success,
      reward,
    });
  }

  getMetrics(): AgentMetrics {
    const attempts = Array.from(this.data.bountyAttempts.values());
    const totalTimeMinutes = attempts.reduce((sum, a) => sum + a.time, 0) / 60000;
    const avgTimePerBounty = this.data.totalBountiesAttempted > 0 ? totalTimeMinutes / this.data.totalBountiesAttempted : 0;

    return {
      totalBountiesDiscovered: this.data.totalBountiesDiscovered,
      totalBountiesAttempted: this.data.totalBountiesAttempted,
      totalSuccessfulSubmissions: this.data.totalSuccessfulSubmissions,
      totalRewardEarned: this.data.totalRewardEarned,
      successRate: this.data.totalBountiesAttempted > 0
        ? (this.data.totalSuccessfulSubmissions / this.data.totalBountiesAttempted) * 100
        : 0,
      averageTimePerBounty: avgTimePerBounty,
      totalEarnings: this.data.totalRewardEarned,
    };
  }

  printReport(): void {
    const metrics = this.getMetrics();
    console.log('\n' + '='.repeat(60));
    console.log('📊 EARNPILOT METRICS REPORT');
    console.log('='.repeat(60));
    console.log(`Total Bounties Discovered:    ${metrics.totalBountiesDiscovered}`);
    console.log(`Total Bounties Attempted:     ${metrics.totalBountiesAttempted}`);
    console.log(`Successful Submissions:       ${metrics.totalSuccessfulSubmissions}`);
    console.log(`Success Rate:                 ${metrics.successRate.toFixed(2)}%`);
    console.log(`Total Earnings:               $${metrics.totalRewardEarned}`);
    console.log(`Average Time per Bounty:      ${metrics.averageTimePerBounty.toFixed(2)} minutes`);
    console.log('='.repeat(60) + '\n');
  }
}

export const logger = new Logger();
export const metrics = new Metrics();
