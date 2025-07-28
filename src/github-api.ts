import { GitHubIssue, GitHubLabel } from './types';

export class GitHubAPI {
  private token: string;
  private owner: string;
  private repo: string;
  private baseURL = 'https://api.github.com';

  constructor(token: string, owner: string, repo: string) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ user: any; repo: any }> {
    // Test user authentication
    const user = await this.request('/user');
    
    // Test repository access
    const repo = await this.request(`/repos/${this.owner}/${this.repo}`);
    
    return { user, repo };
  }

  async getIssues(state: 'all' | 'open' | 'closed' = 'all'): Promise<GitHubIssue[]> {
    return this.request<GitHubIssue[]>(`/repos/${this.owner}/${this.repo}/issues?state=${state}&per_page=100`);
  }

  async createIssue(title: string, body = '', labels: string[] = []): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(`/repos/${this.owner}/${this.repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        labels
      })
    });
  }

  async updateIssue(issueNumber: number, updates: Partial<GitHubIssue>): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async closeIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(issueNumber, { state: 'closed' });
  }

  async reopenIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.updateIssue(issueNumber, { state: 'open' });
  }

  async deleteIssue(issueNumber: number): Promise<GitHubIssue> {
    // GitHub doesn't allow deleting issues via API, so we'll close and add a label
    return this.updateIssue(issueNumber, { 
      state: 'closed',
      labels: ['deleted'] as any
    });
  }

  async getIssue(issueNumber: number): Promise<GitHubIssue> {
    return this.request<GitHubIssue>(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}`);
  }

  async getIssueComments(issueNumber: number): Promise<any[]> {
    return this.request<any[]>(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`);
  }

  async getIssueWithComments(issueNumber: number): Promise<any> {
    const [issue, comments] = await Promise.all([
      this.getIssue(issueNumber),
      this.getIssueComments(issueNumber)
    ]);
    
    return {
      ...issue,
      comments
    };
  }

  async addCommentToIssue(issueNumber: number, body: string): Promise<any> {
    return this.request(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
  }

  async getLabels(): Promise<GitHubLabel[]> {
    return this.request<GitHubLabel[]>(`/repos/${this.owner}/${this.repo}/labels`);
  }

  async createLabel(name: string, color: string, description = ''): Promise<GitHubLabel> {
    return this.request<GitHubLabel>(`/repos/${this.owner}/${this.repo}/labels`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        color,
        description
      })
    });
  }

  async ensurePriorityLabels(): Promise<void> {
    try {
      const labels = await this.getLabels();
      const priorityLabels = [
        { name: 'priority: low', color: '28a745', description: 'Low priority todo item' },
        { name: 'priority: medium', color: 'ffc107', description: 'Medium priority todo item' },
        { name: 'priority: high', color: 'dc3545', description: 'High priority todo item' }
      ];

      for (const label of priorityLabels) {
        const exists = labels.find(l => l.name === label.name);
        if (!exists) {
          await this.createLabel(label.name, label.color, label.description);
        }
      }
    } catch (error) {
      console.warn('Could not create priority labels:', error instanceof Error ? error.message : error);
    }
  }

  // Update repository settings
  updateRepository(owner: string, repo: string): void {
    this.owner = owner;
    this.repo = repo;
  }

  // Get current repository info
  getCurrentRepository(): { owner: string; repo: string } {
    return { owner: this.owner, repo: this.repo };
  }
}
