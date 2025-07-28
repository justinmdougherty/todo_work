import './style.css'
import { GitHubAPI } from './github-api.js'
import { TodoManager } from './todo-manager.js'

class TodoApp {
  constructor() {
    this.githubAPI = null
    this.todoManager = null
    this.currentFilter = 'all'
    this.selectedLabels = new Set()
    this.availableLabels = []
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

    // New issue modal
    const newIssueBtn = document.getElementById('new-issue-btn')
    if (newIssueBtn) {
      newIssueBtn.addEventListener('click', () => this.openNewIssueModal())
    }

    // Modal event listeners
    document.addEventListener('click', (e) => {
      // Handle modal close button
      if (e.target.closest('.modal-close')) {
        this.closeNewIssueModal()
      }
      
      // Handle filter tabs
      if (e.target.classList.contains('filter-tab')) {
        this.setFilter(e.target.dataset.filter)
      }
      
      // Handle modal background click to close
      if (e.target.classList.contains('modal-overlay')) {
        this.closeNewIssueModal()
      }
    })

    // Modal form buttons
    document.addEventListener('click', (e) => {
      if (e.target.id === 'cancel-issue-btn') {
        this.closeNewIssueModal()
      }
      if (e.target.id === 'create-issue-btn') {
        this.createNewIssue()
      }
    })

    // Enter key handling for forms
    document.getElementById('github-token').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.connectToGitHub()
    })

    // Handle Enter key in modal
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && document.getElementById('new-issue-modal').style.display !== 'none') {
        if (e.target.id === 'new-issue-title') {
          this.createNewIssue()
        }
      }
    })

    // Handle Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('new-issue-modal').style.display !== 'none') {
        this.closeNewIssueModal()
      }
    })
  }

  loadStoredConfig() {
    // Check environment variables first (Vite exposes VITE_ prefixed variables)
    const envToken = import.meta.env.VITE_GITHUB_TOKEN
    const envOwner = import.meta.env.VITE_REPO_OWNER
    const envName = import.meta.env.VITE_REPO_NAME
    
    // Fall back to localStorage if no environment variables
    const token = envToken || localStorage.getItem('github-token')
    const owner = envOwner || localStorage.getItem('repo-owner') || 'justinmdougherty'
    const name = envName || localStorage.getItem('repo-name') || 'todo_work'

    if (token) {
      document.getElementById('github-token').value = token
    }
    document.getElementById('repo-owner').value = owner
    document.getElementById('repo-name').value = name

    // Show helpful message if using environment variables
    if (envToken) {
      this.showStatus('📝 Using GitHub token from environment variables', 'success')
    }

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
      this.showTodoInterface()
      await this.loadLabels()
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
    const additionalLabels = Array.from(this.selectedLabels)

    if (!title) {
      alert('Please enter a todo title')
      return
    }

    if (!this.todoManager) {
      alert('Please connect to GitHub first')
      return
    }

    try {
      await this.todoManager.createTodo(title, description, priority, additionalLabels)
      
      // Clear form
      document.getElementById('todo-title').value = ''
      document.getElementById('todo-description').value = ''
      document.getElementById('todo-priority').value = 'low'
      this.clearSelectedLabels()
      
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
    container.innerHTML = '<div class="loading-state"><p>Loading issues...</p></div>'

    try {
      const todos = await this.todoManager.getTodos()
      this.updateCounts(todos)
      this.renderTodos(todos)
    } catch (error) {
      console.error('Failed to load todos:', error)
      container.innerHTML = `<div class="loading-state"><p>Failed to load issues: ${error.message}</p></div>`
    }
  }

  updateCounts(todos) {
    const openCount = todos.filter(t => t.state === 'open').length
    const closedCount = todos.filter(t => t.state === 'closed').length
    
    // Update header counts
    const issuesCount = document.getElementById('issues-count')
    if (issuesCount) {
      issuesCount.textContent = `${openCount} Open`
    }
    
    // Update filter tab counts
    const openCountEl = document.getElementById('open-count')
    const closedCountEl = document.getElementById('closed-count')
    if (openCountEl) openCountEl.textContent = openCount
    if (closedCountEl) closedCountEl.textContent = closedCount
  }

  renderTodos(todos) {
    const container = document.getElementById('todos-container')
    
    if (todos.length === 0) {
      container.innerHTML = '<div class="loading-state"><p>No issues found. Create your first issue!</p></div>'
      return
    }

    const filteredTodos = this.filterTodos(todos)
    
    if (filteredTodos.length === 0) {
      container.innerHTML = '<div class="loading-state"><p>No issues match the current filter.</p></div>'
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
    const nonPriorityLabels = todo.labels.filter(label => 
      !label.name.toLowerCase().startsWith('priority:') && 
      !label.name.toLowerCase().includes('todo') &&
      !label.name.toLowerCase().includes('deleted')
    )
    
    return `
      <div class="todo-item ${isCompleted ? 'completed' : ''}" data-id="${todo.number}">
        <div class="todo-header">
          <div class="todo-title-section">
            <h3 class="todo-title">${this.escapeHtml(todo.title)}</h3>
            ${nonPriorityLabels.length > 0 ? `
              <div class="todo-labels">
                ${nonPriorityLabels.map(label => `
                  <span class="todo-label" style="background-color: #${label.color}">${this.escapeHtml(label.name)}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="todo-actions-inline">
            <span class="todo-priority priority-${priority}">${priority}</span>
            <button class="edit-labels-btn" data-action="edit-labels" data-id="${todo.number}">🏷️ Labels</button>
          </div>
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
        case 'edit-labels':
          await this.openLabelEditor(todoId)
          return // Don't reload todos for edit action
      }
      
      this.loadTodos()
    } catch (error) {
      console.error(`Failed to ${action} todo:`, error)
      alert(`Failed to ${action} todo: ${error.message}`)
    }
  }

  setFilter(filter) {
    this.currentFilter = filter
    
    // Update active filter tab
    document.querySelectorAll('.filter-tab').forEach(btn => {
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

  getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(0, 2), 16)
    const g = parseInt(hexColor.substr(2, 2), 16)
    const b = parseInt(hexColor.substr(4, 2), 16)
    
    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    
    // Return white or black based on brightness
    return brightness > 155 ? '#000000' : '#ffffff'
  }

  showStatus(message, type) {
    const status = document.getElementById('connection-status')
    status.textContent = message
    status.className = `status ${type}`
  }

  showTodoInterface() {
    document.getElementById('github-config').style.display = 'none'
    document.getElementById('todo-interface').style.display = 'block'
  }

  // Label Management Functions

  renderModalLabels() {
    const container = document.getElementById('modal-available-labels-grid')
    
    if (!container) {
      console.log('modal-available-labels-grid container not found - modal not open')
      return
    }
    
    if (this.availableLabels.length === 0) {
      container.innerHTML = '<div class="loading-labels">No labels available</div>'
      return
    }
    
    console.log('Rendering modal labels. Selected:', Array.from(this.selectedLabels))
    
    container.innerHTML = this.availableLabels.map(label => {
      const isSelected = this.selectedLabels.has(label.name)
      console.log(`Label ${label.name} is selected: ${isSelected}`)
      
      return `
        <div class="label-option-compact ${isSelected ? 'selected' : ''}" 
             data-label="${this.escapeHtml(label.name)}" 
             style="background-color: #${label.color}; color: ${this.getContrastColor(label.color)};">
          ${this.escapeHtml(label.name)}
        </div>
      `
    }).join('') + `
      <button class="add-new-label-btn-compact">+ Add Label</button>
    `

    // Add click listeners to label elements
    container.querySelectorAll('.label-option-compact[data-label]').forEach(labelEl => {
      labelEl.addEventListener('click', (e) => {
        const labelName = e.target.dataset.label
        this.toggleLabel(labelName)
      })
    })

    // Add click listener to "Add Label" button
    const addBtn = container.querySelector('.add-new-label-btn-compact')
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddLabelForm())
    }

    // Update modal labels count
    const labelsCount = document.getElementById('modal-labels-count')
    if (labelsCount) {
      labelsCount.textContent = `${this.availableLabels.length} labels`
    }
  }

  toggleLabel(labelName) {
    console.log('toggleLabel called with:', labelName)
    console.log('Current selectedLabels:', Array.from(this.selectedLabels))
    
    if (this.selectedLabels.has(labelName)) {
      this.selectedLabels.delete(labelName)
      console.log('Removed label:', labelName)
    } else {
      this.selectedLabels.add(labelName)
      console.log('Added label:', labelName)
    }
    
    console.log('New selectedLabels:', Array.from(this.selectedLabels))
    this.renderSelectedLabels()
    this.renderModalLabels() // Re-render modal labels to update selected state
    this.renderModalSelectedLabels() // Update modal display too
    this.updateSelectedLabelsDisplay()
  }

  renderSelectedLabels() {
    const container = document.getElementById('selected-labels')
    const selectedArray = Array.from(this.selectedLabels)
    
    container.innerHTML = selectedArray.map(labelName => {
      const label = this.availableLabels.find(l => l.name === labelName)
      const color = label ? label.color : '6366f1'
      
      return `
        <div class="label-tag" style="background-color: #${color};">
          ${this.escapeHtml(labelName)}
          <button class="remove-label" onclick="app.removeLabel('${this.escapeHtml(labelName)}')" type="button">×</button>
        </div>
      `
    }).join('')
  }

  removeLabel(labelName) {
    this.selectedLabels.delete(labelName)
    this.renderSelectedLabels()
    this.renderModalLabels() // Re-render to update selected state
    this.renderModalSelectedLabels() // Update modal display too
    this.updateSelectedLabelsDisplay()
  }

  clearSelectedLabels() {
    this.selectedLabels.clear()
    this.renderSelectedLabels()
    this.renderModalLabels() // Re-render to update selected state
    this.renderModalSelectedLabels() // Update modal display too
    this.updateSelectedLabelsDisplay()
  }

  updateSelectedLabelsDisplay() {
    const display = document.getElementById('selected-labels-display')
    if (this.selectedLabels.size > 0) {
      display.style.display = 'block'
    } else {
      display.style.display = 'none'
    }
  }

  showAddLabelForm() {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Add New Label</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="add-label-form">
            <input type="text" id="new-label-name" placeholder="Label name" />
            <input type="text" id="new-label-description" placeholder="Description (optional)" />
            <div class="color-picker">
              <label for="new-label-color">Color:</label>
              <input type="color" id="new-label-color" value="#6366f1" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn-primary" onclick="app.createNewLabel()">Create Label</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    document.getElementById('new-label-name').focus()
  }

  async createNewLabel() {
    const name = document.getElementById('new-label-name').value.trim()
    const description = document.getElementById('new-label-description').value.trim()
    const color = document.getElementById('new-label-color').value.replace('#', '')

    if (!name) {
      alert('Please enter a label name')
      return
    }

    try {
      await this.githubAPI.createLabel(name, color, description)
      
      // Reload labels to include the new one
      await this.loadLabels()
      
      // Close modal
      document.querySelector('.modal-overlay').remove()
      
      // Automatically select the new label
      this.selectedLabels.add(name)
      this.renderSelectedLabels()
      this.renderModalLabels()
      this.renderModalSelectedLabels()
    } catch (error) {
      console.error('Failed to create label:', error)
      alert(`Failed to create label: ${error.message}`)
    }
  }

  async openLabelEditor(todoId) {
    try {
      const todo = await this.todoManager.github.getIssue(todoId)
      const currentLabels = new Set(todo.labels.map(l => l.name))
      
      // Create a modal for editing labels
      const modal = this.createLabelEditModal(todoId, currentLabels)
      document.body.appendChild(modal)
    } catch (error) {
      console.error('Failed to open label editor:', error)
      alert(`Failed to open label editor: ${error.message}`)
    }
  }

  createLabelEditModal(todoId, currentLabels) {
    const modal = document.createElement('div')
    modal.className = 'modal-overlay'
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit Labels for Todo #${todoId}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="label-editor">
            <div class="current-labels" id="modal-current-labels"></div>
            <div class="add-labels-section">
              <input type="text" id="modal-label-search" placeholder="Search labels..." />
              <div id="modal-available-labels" class="available-labels"></div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn-primary" onclick="app.saveLabelChanges(${todoId})">Save Changes</button>
        </div>
      </div>
    `
    
    // Setup modal label functionality
    setTimeout(() => {
      this.setupModalLabelEditor(todoId, currentLabels)
    }, 0)
    
    return modal
  }

  setupModalLabelEditor(todoId, currentLabels) {
    this.modalSelectedLabels = new Set(currentLabels)
    this.renderModalLabels()
    
    // Setup search
    const searchInput = document.getElementById('modal-label-search')
    searchInput.addEventListener('input', (e) => this.filterModalLabels(e.target.value))
  }

  renderModalLabels() {
    // Render current labels
    const currentContainer = document.getElementById('modal-current-labels')
    const currentArray = Array.from(this.modalSelectedLabels).filter(name => 
      !name.toLowerCase().startsWith('priority:') && 
      !name.toLowerCase().includes('todo') &&
      !name.toLowerCase().includes('deleted')
    )
    
    currentContainer.innerHTML = currentArray.map(labelName => {
      const label = this.availableLabels.find(l => l.name === labelName)
      const color = label ? label.color : '6366f1'
      
      return `
        <div class="label-tag" style="background-color: #${color};">
          ${this.escapeHtml(labelName)}
          <button class="remove-label" onclick="app.removeModalLabel('${this.escapeHtml(labelName)}')" type="button">×</button>
        </div>
      `
    }).join('')
    
    // Render available labels
    this.renderModalAvailableLabels()
  }

  renderModalAvailableLabels(filteredLabels = null) {
    const container = document.getElementById('modal-available-labels')
    const labels = filteredLabels || this.availableLabels
    
    container.innerHTML = labels.map(label => `
      <div class="label-option ${this.modalSelectedLabels.has(label.name) ? 'selected' : ''}" 
           onclick="app.toggleModalLabel('${this.escapeHtml(label.name)}')">
        <div class="label-preview" style="background-color: #${label.color};">
          ${this.escapeHtml(label.name)}
        </div>
        <div class="label-info">
          <div class="label-name">${this.escapeHtml(label.name)}</div>
          ${label.description ? `<div class="label-description">${this.escapeHtml(label.description)}</div>` : ''}
        </div>
      </div>
    `).join('')
  }

  filterModalLabels(searchTerm) {
    const filtered = this.availableLabels.filter(label =>
      label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (label.description && label.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    this.renderModalAvailableLabels(filtered)
  }

  toggleModalLabel(labelName) {
    if (this.modalSelectedLabels.has(labelName)) {
      this.modalSelectedLabels.delete(labelName)
    } else {
      this.modalSelectedLabels.add(labelName)
    }
    this.renderModalLabels()
  }

  removeModalLabel(labelName) {
    this.modalSelectedLabels.delete(labelName)
    this.renderModalLabels()
  }

  async saveLabelChanges(todoId) {
    try {
      const labelsArray = Array.from(this.modalSelectedLabels)
      await this.todoManager.setTodoLabels(todoId, labelsArray)
      
      // Close modal
      document.querySelector('.modal-overlay').remove()
      
      // Reload todos
      this.loadTodos()
    } catch (error) {
      console.error('Failed to save label changes:', error)
      alert(`Failed to save label changes: ${error.message}`)
    }
  }

  // New Issue Modal Functions
  openNewIssueModal() {
    const modal = document.getElementById('new-issue-modal')
    modal.style.display = 'flex'
    
    // Clear form
    document.getElementById('new-issue-title').value = ''
    document.getElementById('new-issue-description').value = ''
    document.getElementById('new-issue-priority').value = 'low'
    
    // Clear and render labels
    this.clearSelectedLabels()
    this.renderModalLabels()
    this.renderModalSelectedLabels()
    
    // Focus title input
    setTimeout(() => {
      document.getElementById('new-issue-title').focus()
    }, 100)
  }

  closeNewIssueModal() {
    const modal = document.getElementById('new-issue-modal')
    modal.style.display = 'none'
    this.clearSelectedLabels()
  }

  renderModalSelectedLabels() {
    const container = document.getElementById('modal-selected-labels')
    const selectedArray = Array.from(this.selectedLabels)
    
    container.innerHTML = selectedArray.map(labelName => {
      const label = this.availableLabels.find(l => l.name === labelName)
      const color = label ? label.color : '6366f1'
      
      return `
        <div class="label-tag" style="background-color: #${color};">
          ${this.escapeHtml(labelName)}
          <button class="remove-label" onclick="app.removeLabel('${this.escapeHtml(labelName)}')" type="button">×</button>
        </div>
      `
    }).join('')
  }

  async createNewIssue() {
    const title = document.getElementById('new-issue-title').value.trim()
    const description = document.getElementById('new-issue-description').value.trim()
    const priority = document.getElementById('new-issue-priority').value
    const additionalLabels = Array.from(this.selectedLabels)

    if (!title) {
      alert('Please enter an issue title')
      return
    }

    if (!this.todoManager) {
      alert('Please connect to GitHub first')
      return
    }

    try {
      await this.todoManager.createTodo(title, description, priority, additionalLabels)
      
      // Close modal and clear form
      this.closeNewIssueModal()
      
      // Reload todos
      this.loadTodos()
    } catch (error) {
      console.error('Failed to create issue:', error)
      alert(`Failed to create issue: ${error.message}`)
    }
  }

  async loadLabels() {
    if (!this.todoManager) return
    
    try {
      // First ensure labels are loaded from GitHub
      await this.todoManager.loadLabels()
      // Then get the filtered labels
      this.availableLabels = this.todoManager.getNonPriorityLabels()
      console.log('Loaded labels:', this.availableLabels.length)
      console.log('Available labels:', this.availableLabels.map(l => l.name))
      // Labels are now only rendered in modal, not on main page
    } catch (error) {
      console.error('Failed to load labels:', error)
    }
  }

  updateLabelsCount() {
    const labelsCount = document.getElementById('labels-count')
    if (labelsCount) {
      labelsCount.textContent = `${this.availableLabels.length} labels`
    }
  }
}

// Make app globally available for onclick handlers
let app

// Initialize the app
app = new TodoApp()
