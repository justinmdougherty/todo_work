export interface Repository {
  owner: string;
  name: string;
  displayName: string;
}

export interface GitHubConfig {
  token: string;
  currentRepo: Repository;
  repositories: Repository[];
}

export interface GitHubIssue {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  html_url: string;
  labels: GitHubLabel[];
  pull_request?: any; // We filter these out
}

export interface GitHubLabel {
  name: string;
  color: string;
  description?: string;
}

export interface TodoItem extends GitHubIssue {
  priority: 'low' | 'medium' | 'high';
}

export interface CreateTodoParams {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  labels?: string[];
}

export interface AppState {
  isConnected: boolean;
  isLoading: boolean;
  config: GitHubConfig | null;
  todos: TodoItem[];
  labels: GitHubLabel[];
  currentFilter: 'all' | 'open' | 'closed';
  selectedLabels: Set<string>;
  error: string | null;
  connectionStatus: {
    message: string;
    type: 'info' | 'success' | 'error';
  } | null;
}
