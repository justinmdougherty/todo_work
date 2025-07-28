# Copilot Instructions for Todo Work Management

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a web-based todo work management application that transforms GitHub Issues into a clean todo interface. Built with Vite and vanilla JavaScript, it provides professional task management for technical work.

## Architecture Overview

**Three-Layer Architecture:**

- `src/main.js` - UI controller and app orchestration (600+ lines)
- `src/todo-manager.js` - Business logic layer for todo operations
- `src/github-api.js` - GitHub REST API wrapper with authentication

**Key Design Pattern:** GitHub Issues serve as the backend data store. Todos are GitHub issues with special labels (`todo`, `priority: low/medium/high`, `deleted`). The app never deletes issues, only closes and labels them.

## Critical Developer Workflows

**Development:**

```bash
npm run dev          # Vite dev server with hot reload
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

**Authentication Setup (two methods):**

1. Environment variables: `VITE_GITHUB_TOKEN`, `VITE_REPO_OWNER`, `VITE_REPO_NAME` in `.env`
2. Runtime entry via UI (stored in localStorage)

**GitHub CLI Integration (Windows PowerShell):**

```powershell
# Base command path - required for PowerShell
"C:\gh-cli\bin\gh.exe"

# Issue/Todo Management
& "C:\gh-cli\bin\gh.exe" issue create --title "Title" --body "Description" --label "priority: medium,LBHH,FW"
& "C:\gh-cli\bin\gh.exe" issue list --state open
& "C:\gh-cli\bin\gh.exe" issue list --label "LBHH"
& "C:\gh-cli\bin\gh.exe" issue close [ISSUE_NUMBER]
& "C:\gh-cli\bin\gh.exe" issue reopen [ISSUE_NUMBER]

# Label Management
& "C:\gh-cli\bin\gh.exe" label list
& "C:\gh-cli\bin\gh.exe" label create "SOCOM" --description "SOCOM related tasks" --color "FFEAA7"
& "C:\gh-cli\bin\gh.exe" label create "Hardware" --description "Hardware related tasks" --color "96CEB4"

# Repository Operations
& "C:\gh-cli\bin\gh.exe" repo view
& "C:\gh-cli\bin\gh.exe" auth status
```

## Project-Specific Patterns

**Label System:** Auto-creates priority labels (`priority: low/medium/high`) with specific colors. Non-priority labels for project categorization (LBHH, FW, WF, SOCOM, TBI, HAWK, Hardware, ELERA-C, Test Plan, Battery Study, Ordering, Cost Estimate, SOW).

**State Management:** Uses `Set()` for selected labels, filters todos client-side, maintains connection state in main app class. No external state management - vanilla JS with manual DOM updates.

**CSS Architecture:** GitHub-inspired dark theme with CSS custom properties. Uses CSS Grid for responsive layouts. Color scheme auto-adapts to system preferences.

**Error Handling:** Graceful degradation for API failures. Rate limiting awareness. Network errors show user-friendly messages.

## Integration Points

**GitHub API:** REST v3 exclusively. Token-based auth with `Bearer` headers. Rate limiting handled through error messages. Issues endpoint used for all todo operations.

**LocalStorage:** Persists GitHub config (token, owner, repo). Environment variables take precedence over localStorage.

**Modal System:** Dynamic modal creation in `main.js` for label editing. Event delegation for dynamically created elements.

## Key Files & Their Purpose

- `src/main.js` - TodoApp class with all UI logic, event handling, and DOM manipulation
- `src/github-api.js` - GitHubAPI class with request wrapper and issue management
- `src/todo-manager.js` - TodoManager class bridging GitHub API and app logic
- `github-cli-helpers.md` - PowerShell commands for manual GitHub operations
- `src/style.css` - Complete styling with GitHub dark theme and responsive design

When adding features, follow the three-layer separation: UI changes in main.js, business logic in todo-manager.js, API calls in github-api.js.
