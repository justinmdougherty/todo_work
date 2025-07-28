export class TodoManager {
  constructor(githubAPI) {
    this.github = githubAPI
    this.init()
  }

  async init() {
    // Ensure priority labels exist
    await this.github.ensurePriorityLabels()
  }

  async getTodos() {
    const issues = await this.github.getIssues('all')
    
    // Filter out pull requests (they also appear in issues endpoint)
    return issues.filter(issue => !issue.pull_request)
  }

  async createTodo(title, description = '', priority = 'low') {
    const labels = [`priority: ${priority}`, 'todo']
    
    const body = description || 'Todo created via Todo Work app'
    
    return this.github.createIssue(title, body, labels)
  }

  async completeTodo(todoId) {
    return this.github.closeIssue(todoId)
  }

  async reopenTodo(todoId) {
    return this.github.reopenIssue(todoId)
  }

  async deleteTodo(todoId) {
    return this.github.deleteIssue(todoId)
  }

  async viewTodo(todoId) {
    const issue = await this.github.getIssue(todoId)
    const issueUrl = `https://github.com/${this.github.owner}/${this.github.repo}/issues/${todoId}`
    
    // Open in new tab
    window.open(issueUrl, '_blank')
    
    return issue
  }

  async updateTodo(todoId, updates) {
    return this.github.updateIssue(todoId, updates)
  }

  formatTodoForDisplay(issue) {
    return {
      id: issue.number,
      title: issue.title,
      description: issue.body,
      state: issue.state,
      priority: this.extractPriority(issue.labels),
      created: issue.created_at,
      updated: issue.updated_at,
      url: issue.html_url,
      labels: issue.labels
    }
  }

  extractPriority(labels) {
    const priorityLabel = labels.find(label => 
      label.name.toLowerCase().startsWith('priority:')
    )
    
    if (priorityLabel) {
      const priority = priorityLabel.name.split(':')[1]?.trim()
      return priority || 'low'
    }
    
    return 'low'
  }

  async searchTodos(query) {
    const todos = await this.getTodos()
    
    if (!query) return todos
    
    const searchTerm = query.toLowerCase()
    return todos.filter(todo => 
      todo.title.toLowerCase().includes(searchTerm) ||
      (todo.body && todo.body.toLowerCase().includes(searchTerm))
    )
  }

  async getTodosByPriority(priority) {
    const todos = await this.getTodos()
    return todos.filter(todo => 
      this.extractPriority(todo.labels) === priority
    )
  }

  async getTodoStats() {
    const todos = await this.getTodos()
    
    return {
      total: todos.length,
      open: todos.filter(t => t.state === 'open').length,
      closed: todos.filter(t => t.state === 'closed').length,
      byPriority: {
        high: todos.filter(t => this.extractPriority(t.labels) === 'high').length,
        medium: todos.filter(t => this.extractPriority(t.labels) === 'medium').length,
        low: todos.filter(t => this.extractPriority(t.labels) === 'low').length
      }
    }
  }
}
