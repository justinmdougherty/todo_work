import { GitHubAPI } from './github-api';
import { TodoItem, GitHubLabel } from './types';

export class TodoManager {
  private github: GitHubAPI;
  private labels: GitHubLabel[] = [];

  constructor(githubAPI: GitHubAPI) {
    this.github = githubAPI;
  }

  async init(): Promise<void> {
    // Ensure priority labels exist
    await this.github.ensurePriorityLabels();
    await this.loadLabels();
  }

  async getTodos(): Promise<TodoItem[]> {
    const issues = await this.github.getIssues('all');
    
    // Filter out pull requests (they also appear in issues endpoint)
    const todos = issues
      .filter(issue => !issue.pull_request)
      .map(issue => this.formatTodoForDisplay(issue));

    return todos;
  }

  async createTodo(title: string, description = '', priority: 'low' | 'medium' | 'high' = 'low', additionalLabels: string[] = []): Promise<TodoItem> {
    const labels = [`priority: ${priority}`, 'todo', ...additionalLabels];
    const body = description || 'Todo created via Todo Work app';
    
    const issue = await this.github.createIssue(title, body, labels);
    return this.formatTodoForDisplay(issue);
  }

  async completeTodo(todoId: number): Promise<TodoItem> {
    const issue = await this.github.closeIssue(todoId);
    return this.formatTodoForDisplay(issue);
  }

  async reopenTodo(todoId: number): Promise<TodoItem> {
    const issue = await this.github.reopenIssue(todoId);
    return this.formatTodoForDisplay(issue);
  }

  async deleteTodo(todoId: number): Promise<TodoItem> {
    const issue = await this.github.deleteIssue(todoId);
    return this.formatTodoForDisplay(issue);
  }

  async viewTodo(todoId: number): Promise<TodoItem> {
    const issue = await this.github.getIssue(todoId);
    const repo = this.github.getCurrentRepository();
    const issueUrl = `https://github.com/${repo.owner}/${repo.repo}/issues/${todoId}`;
    
    // Open in new tab
    window.open(issueUrl, '_blank');
    
    return this.formatTodoForDisplay(issue);
  }

  async updateTodo(todoId: number, updates: any): Promise<TodoItem> {
    const issue = await this.github.updateIssue(todoId, updates);
    return this.formatTodoForDisplay(issue);
  }

  async setTodoLabels(todoId: number, labels: string[]): Promise<TodoItem> {
    const issue = await this.github.updateIssue(todoId, { labels: labels as any });
    return this.formatTodoForDisplay(issue);
  }

  private formatTodoForDisplay(issue: any): TodoItem {
    return {
      ...issue,
      priority: this.extractPriority(issue.labels)
    };
  }

  private extractPriority(labels: GitHubLabel[]): 'low' | 'medium' | 'high' {
    const priorityLabel = labels.find(label => 
      label.name.toLowerCase().startsWith('priority:')
    );
    
    if (priorityLabel) {
      const priority = priorityLabel.name.split(':')[1]?.trim() as 'low' | 'medium' | 'high';
      return priority || 'low';
    }
    
    return 'low';
  }

  async searchTodos(query: string): Promise<TodoItem[]> {
    const todos = await this.getTodos();
    
    if (!query) return todos;
    
    const searchTerm = query.toLowerCase();
    return todos.filter(todo => 
      todo.title.toLowerCase().includes(searchTerm) ||
      (todo.body && todo.body.toLowerCase().includes(searchTerm))
    );
  }

  async getTodosByPriority(priority: 'low' | 'medium' | 'high'): Promise<TodoItem[]> {
    const todos = await this.getTodos();
    return todos.filter(todo => todo.priority === priority);
  }

  async getTodoStats(): Promise<{
    total: number;
    open: number;
    closed: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
  }> {
    const todos = await this.getTodos();
    
    return {
      total: todos.length,
      open: todos.filter(t => t.state === 'open').length,
      closed: todos.filter(t => t.state === 'closed').length,
      byPriority: {
        high: todos.filter(t => t.priority === 'high').length,
        medium: todos.filter(t => t.priority === 'medium').length,
        low: todos.filter(t => t.priority === 'low').length
      }
    };
  }

  async loadLabels(): Promise<void> {
    this.labels = await this.github.getLabels();
  }

  getNonPriorityLabels(): GitHubLabel[] {
    return this.labels.filter(label => 
      !label.name.toLowerCase().startsWith('priority:') && 
      !label.name.toLowerCase().includes('todo') &&
      !label.name.toLowerCase().includes('deleted')
    );
  }

  getAllLabels(): GitHubLabel[] {
    return this.labels;
  }

  // Switch to a different repository
  switchRepository(owner: string, repo: string): void {
    this.github.updateRepository(owner, repo);
    // Clear cached labels since we're switching repos
    this.labels = [];
  }
}
