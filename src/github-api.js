export class GitHubAPI {
  constructor(token, owner, repo) {
    this.token = token
    this.owner = owner
    this.repo = repo
    this.baseURL = 'https://api.github.com'
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async testConnection() {
    // Test user authentication
    const user = await this.request('/user')
    
    // Test repository access
    const repo = await this.request(`/repos/${this.owner}/${this.repo}`)
    
    return { user, repo }
  }

  async getIssues(state = 'all') {
    return this.request(`/repos/${this.owner}/${this.repo}/issues?state=${state}&per_page=100`)
  }

  async createIssue(title, body = '', labels = []) {
    return this.request(`/repos/${this.owner}/${this.repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        body,
        labels
      })
    })
  }

  async updateIssue(issueNumber, updates) {
    return this.request(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  async closeIssue(issueNumber) {
    return this.updateIssue(issueNumber, { state: 'closed' })
  }

  async reopenIssue(issueNumber) {
    return this.updateIssue(issueNumber, { state: 'open' })
  }

  async deleteIssue(issueNumber) {
    // GitHub doesn't allow deleting issues via API, so we'll close and add a label
    await this.updateIssue(issueNumber, { 
      state: 'closed',
      labels: ['deleted']
    })
  }

  async getIssue(issueNumber) {
    return this.request(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}`)
  }

  async getLabels() {
    return this.request(`/repos/${this.owner}/${this.repo}/labels`)
  }

  async createLabel(name, color, description = '') {
    return this.request(`/repos/${this.owner}/${this.repo}/labels`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        color,
        description
      })
    })
  }

  async addLabelsToIssue(issueNumber, labels) {
    return this.request(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/labels`, {
      method: 'POST',
      body: JSON.stringify({
        labels
      })
    })
  }

  async removeLabelsFromIssue(issueNumber, labels) {
    // GitHub API requires removing labels one by one
    const promises = labels.map(label => 
      this.request(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`, {
        method: 'DELETE'
      })
    )
    return Promise.all(promises)
  }

  async setIssueLabels(issueNumber, labels) {
    return this.request(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}/labels`, {
      method: 'PUT',
      body: JSON.stringify({
        labels
      })
    })
  }

  async ensurePriorityLabels() {
    try {
      const labels = await this.getLabels()
      const priorityLabels = [
        { name: 'priority: low', color: '28a745', description: 'Low priority todo item' },
        { name: 'priority: medium', color: 'ffc107', description: 'Medium priority todo item' },
        { name: 'priority: high', color: 'dc3545', description: 'High priority todo item' }
      ]

      for (const label of priorityLabels) {
        const exists = labels.find(l => l.name === label.name)
        if (!exists) {
          await this.createLabel(label.name, label.color, label.description)
        }
      }
    } catch (error) {
      console.warn('Could not create priority labels:', error.message)
    }
  }
}
