import './style.css'
import { GitHubAPI } from './github-api.js'
import { TodoManager } from './todo-manager.js'

class TodoApp {
  constructor() {
    this.githubAPI = null
    this.todoManager = null
    this.currentFilter = 'all'
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.loadStoredConfig()
  }

  setupEventListeners() {
    // GitHub connection
    const connectBtn = document.getElementById('connect-btn')
    connectBtn.addEventListener('click', () => this.connectToGitHub())

    // Todo form
    const addTodoBtn = document.getElementById('add-todo-btn')
    addTodoBtn.addEventListener('click', () => this.addTodo())

    // Enter key handling for forms
    document.getElementById('github-token').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.connectToGitHub()
    })

    document.getElementById('todo-title').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTodo()
    })

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter))
    })
  }

  loadStoredConfig() {
    const token = localStorage.getItem('github-token')
    const owner = localStorage.getItem('repo-owner') || 'justinmdougherty'
    const name = localStorage.getItem('repo-name') || 'todo_work'

    if (token) {
      document.getElementById('github-token').value = token
    }
    document.getElementById('repo-owner').value = owner
    document.getElementById('repo-name').value = name

    if (token && owner && name) {
      this.connectToGitHub()
    }
  }

  async connectToGitHub() {
    const token = document.getElementById('github-token').value.trim()
    const owner = document.getElementById('repo-owner').value.trim()
    const name = document.getElementById('repo-name').value.trim()

    if (!token || !owner || !name) {
      this.showStatus('Please fill in all GitHub configuration fields', 'error')
      return
    }

    this.showStatus('Connecting to GitHub...', 'info')

    try {
      this.githubAPI = new GitHubAPI(token, owner, name)
      
      // Test connection
      await this.githubAPI.testConnection()
      
      // Store configuration
      localStorage.setItem('github-token', token)
      localStorage.setItem('repo-owner', owner)
      localStorage.setItem('repo-name', name)

      this.todoManager = new TodoManager(this.githubAPI)
      
      this.showStatus('✅ Connected to GitHub successfully!', 'success')
      this.showTodoSection()
      this.loadTodos()
    } catch (error) {
      console.error('GitHub connection failed:', error)
      this.showStatus(`❌ Connection failed: ${error.message}`, 'error')
    }
  }

  async addTodo() {
    const title = document.getElementById('todo-title').value.trim()
    const description = document.getElementById('todo-description').value.trim()
    const priority = document.getElementById('todo-priority').value

    if (!title) {
      alert('Please enter a todo title')
      return
    }

    if (!this.todoManager) {
      alert('Please connect to GitHub first')
      return
    }

    try {
      await this.todoManager.createTodo(title, description, priority)
      
      // Clear form
      document.getElementById('todo-title').value = ''
      document.getElementById('todo-description').value = ''
      document.getElementById('todo-priority').value = 'low'
      
      // Reload todos
      this.loadTodos()
    } catch (error) {
      console.error('Failed to add todo:', error)
      alert(`Failed to add todo: ${error.message}`)
    }
  }

  async loadTodos() {
    if (!this.todoManager) return

    const container = document.getElementById('todos-container')
    container.innerHTML = '<p class="loading">Loading todos...</p>'

    try {
      const todos = await this.todoManager.getTodos()
      this.renderTodos(todos)
    } catch (error) {
      console.error('Failed to load todos:', error)
      container.innerHTML = `<p class="loading">Failed to load todos: ${error.message}</p>`
    }
  }

  renderTodos(todos) {
    const container = document.getElementById('todos-container')
    
    if (todos.length === 0) {
      container.innerHTML = '<p class="loading">No todos found. Create your first todo above!</p>'
      return
    }

    const filteredTodos = this.filterTodos(todos)
    
    if (filteredTodos.length === 0) {
      container.innerHTML = '<p class="loading">No todos match the current filter.</p>'
      return
    }

    container.innerHTML = filteredTodos.map(todo => this.createTodoHTML(todo)).join('')

    // Add event listeners to todo actions
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleTodoAction(e))
    })
  }

  filterTodos(todos) {
    switch (this.currentFilter) {
      case 'open':
        return todos.filter(todo => todo.state === 'open')
      case 'closed':
        return todos.filter(todo => todo.state === 'closed')
      default:
        return todos
    }
  }

  createTodoHTML(todo) {
    const priority = this.extractPriority(todo.labels)
    const isCompleted = todo.state === 'closed'
    
    return `
      <div class="todo-item ${isCompleted ? 'completed' : ''}" data-id="${todo.number}">
        <div class="todo-header">
          <h3 class="todo-title">${this.escapeHtml(todo.title)}</h3>
          <span class="todo-priority priority-${priority}">${priority}</span>
        </div>
        ${todo.body ? `<p class="todo-description">${this.escapeHtml(todo.body)}</p>` : ''}
        <div class="todo-meta">
          <span>Created: ${new Date(todo.created_at).toLocaleDateString()}</span>
          <div class="todo-actions">
            ${!isCompleted ? 
              `<button class="btn-small btn-secondary" data-action="complete" data-id="${todo.number}">✓ Complete</button>` :
              `<button class="btn-small btn-secondary" data-action="reopen" data-id="${todo.number}">↻ Reopen</button>`
            }
            <button class="btn-small btn-secondary" data-action="view" data-id="${todo.number}">👁 View</button>
            <button class="btn-small btn-danger" data-action="delete" data-id="${todo.number}">🗑 Delete</button>
          </div>
        </div>
      </div>
    `
  }

  async handleTodoAction(e) {
    const action = e.target.dataset.action
    const todoId = parseInt(e.target.dataset.id)

    if (!this.todoManager) return

    try {
      switch (action) {
        case 'complete':
          await this.todoManager.completeTodo(todoId)
          break
        case 'reopen':
          await this.todoManager.reopenTodo(todoId)
          break
        case 'view':
          await this.todoManager.viewTodo(todoId)
          return // Don't reload todos for view action
        case 'delete':
          if (confirm('Are you sure you want to delete this todo?')) {
            await this.todoManager.deleteTodo(todoId)
          } else {
            return
          }
          break
      }
      
      this.loadTodos()
    } catch (error) {
      console.error(`Failed to ${action} todo:`, error)
      alert(`Failed to ${action} todo: ${error.message}`)
    }
  }

  setFilter(filter) {
    this.currentFilter = filter
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter)
    })
    
    // Re-render todos with new filter
    if (this.todoManager) {
      this.loadTodos()
    }
  }

  extractPriority(labels) {
    const priorityLabel = labels.find(label => 
      label.name.toLowerCase().includes('priority') ||
      ['low', 'medium', 'high'].includes(label.name.toLowerCase())
    )
    
    if (priorityLabel) {
      const name = priorityLabel.name.toLowerCase()
      if (name.includes('high')) return 'high'
      if (name.includes('medium')) return 'medium'
      if (name.includes('low')) return 'low'
    }
    
    return 'low'
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  showStatus(message, type) {
    const status = document.getElementById('connection-status')
    status.textContent = message
    status.className = `status ${type}`
  }

  showTodoSection() {
    document.getElementById('todo-section').style.display = 'block'
  }
}

// Initialize the app
new TodoApp()
