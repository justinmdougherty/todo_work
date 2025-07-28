import { useState, useEffect, useCallback } from "react";
import { AppState, Repository, GitHubConfig } from "./types";
import { GitHubAPI } from "./github-api";
import { TodoManager } from "./todo-manager";
import GitHubConfigComponent from "./components/GitHubConfig";
import TodoInterface from "./components/TodoInterface";
import "./style.css";

const DEFAULT_REPOSITORIES: Repository[] = [
  { owner: "justinmdougherty", name: "todo_work", displayName: "Work Todos" },
  { owner: "justinmdougherty", name: "todo_home", displayName: "Home Todos" },
];

function App() {
  const [state, setState] = useState<AppState>({
    isConnected: false,
    isLoading: false,
    config: null,
    todos: [],
    labels: [],
    currentFilter: "open",
    selectedLabels: new Set(),
    error: null,
    connectionStatus: null,
  });

  const [githubAPI, setGithubAPI] = useState<GitHubAPI | null>(null);
  const [todoManager, setTodoManager] = useState<TodoManager | null>(null);
  const [viewingTodo, setViewingTodo] = useState<any | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Load stored configuration on mount
  useEffect(() => {
    loadStoredConfig();
  }, []);

  const loadStoredConfig = useCallback(() => {
    // Check environment variables first
    const envToken = import.meta.env.VITE_GITHUB_TOKEN;
    const envOwner = import.meta.env.VITE_REPO_OWNER;
    const envName = import.meta.env.VITE_REPO_NAME;

    // Fall back to localStorage
    const token = envToken || localStorage.getItem("github-token");
    const owner =
      envOwner || localStorage.getItem("repo-owner") || "justinmdougherty";
    const name = envName || localStorage.getItem("repo-name") || "todo_work";

    if (token && owner && name) {
      const currentRepo = {
        owner,
        name,
        displayName: name === "todo_work" ? "Work Todos" : "Home Todos",
      };
      const config: GitHubConfig = {
        token,
        currentRepo,
        repositories: DEFAULT_REPOSITORIES,
      };

      setState((prev) => ({ ...prev, config }));

      if (envToken) {
        setState((prev) => ({
          ...prev,
          connectionStatus: {
            message: "📝 Using GitHub token from environment variables",
            type: "success",
          },
        }));
      }

      connectToGitHub(config);
    }
  }, []);

  const connectToGitHub = useCallback(async (config: GitHubConfig) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      connectionStatus: { message: "Connecting to GitHub...", type: "info" },
    }));

    try {
      const api = new GitHubAPI(
        config.token,
        config.currentRepo.owner,
        config.currentRepo.name
      );

      // Test connection
      await api.testConnection();

      // Store configuration
      localStorage.setItem("github-token", config.token);
      localStorage.setItem("repo-owner", config.currentRepo.owner);
      localStorage.setItem("repo-name", config.currentRepo.name);

      const manager = new TodoManager(api);
      await manager.init();

      setGithubAPI(api);
      setTodoManager(manager);

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        config,
        connectionStatus: {
          message: "✅ Connected to GitHub successfully!",
          type: "success",
        },
        error: null,
      }));

      // Load initial data
      await loadTodos(manager);
      await loadLabels(manager);
    } catch (error) {
      console.error("GitHub connection failed:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isConnected: false,
        connectionStatus: {
          message: `❌ Connection failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          type: "error",
        },
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, []);

  const switchRepository = useCallback(
    async (repo: Repository) => {
      if (!githubAPI || !todoManager || !state.config) return;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        connectionStatus: {
          message: `Switching to ${repo.displayName}...`,
          type: "info",
        },
      }));

      try {
        // Update the API and manager to use new repository
        githubAPI.updateRepository(repo.owner, repo.name);
        todoManager.switchRepository(repo.owner, repo.name);

        // Update config
        const newConfig = {
          ...state.config,
          currentRepo: repo,
        };

        // Test connection to new repo
        await githubAPI.testConnection();

        // Reinitialize manager for new repo
        await todoManager.init();

        setState((prev) => ({
          ...prev,
          config: newConfig,
          isLoading: false,
          connectionStatus: {
            message: `✅ Switched to ${repo.displayName}`,
            type: "success",
          },
        }));

        // Store new repo settings
        localStorage.setItem("repo-owner", repo.owner);
        localStorage.setItem("repo-name", repo.name);

        // Reload data for new repository
        await loadTodos(todoManager);
        await loadLabels(todoManager);
      } catch (error) {
        console.error("Failed to switch repository:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionStatus: {
            message: `❌ Failed to switch repository: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            type: "error",
          },
        }));
      }
    },
    [githubAPI, todoManager, state.config]
  );

  const loadTodos = useCallback(
    async (manager: TodoManager = todoManager!) => {
      if (!manager) return;

      try {
        const todos = await manager.getTodos();
        setState((prev) => ({ ...prev, todos }));
      } catch (error) {
        console.error("Failed to load todos:", error);
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : "Failed to load todos",
        }));
      }
    },
    [todoManager]
  );

  const loadLabels = useCallback(
    async (manager: TodoManager = todoManager!) => {
      if (!manager) return;

      try {
        await manager.loadLabels();
        const labels = manager.getAllLabels();
        setState((prev) => ({ ...prev, labels }));
      } catch (error) {
        console.error("Failed to load labels:", error);
      }
    },
    [todoManager]
  );

  const createTodo = useCallback(
    async (
      title: string,
      description: string,
      priority: "low" | "medium" | "high",
      labels: string[]
    ) => {
      if (!todoManager) return;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        await todoManager.createTodo(title, description, priority, labels);
        // Immediately reload todos and reset selected labels
        await loadTodos();
        setState((prev) => ({
          ...prev,
          selectedLabels: new Set(),
          isLoading: false,
          connectionStatus: {
            message: "✅ Todo created successfully!",
            type: "success",
          },
        }));
      } catch (error) {
        console.error("Failed to create todo:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionStatus: {
            message: `❌ Failed to create todo: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            type: "error",
          },
        }));
        throw error;
      }
    },
    [todoManager, loadTodos]
  );

  const updateTodoState = useCallback(
    async (todoId: number, action: "complete" | "reopen" | "delete") => {
      if (!todoManager) return;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        switch (action) {
          case "complete":
            await todoManager.completeTodo(todoId);
            break;
          case "reopen":
            await todoManager.reopenTodo(todoId);
            break;
          case "delete":
            await todoManager.deleteTodo(todoId);
            break;
        }

        // Immediately reload todos
        await loadTodos();
        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionStatus: {
            message: `✅ Todo ${action}d successfully!`,
            type: "success",
          },
        }));
      } catch (error) {
        console.error(`Failed to ${action} todo:`, error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionStatus: {
            message: `❌ Failed to ${action} todo: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            type: "error",
          },
        }));
        throw error;
      }
    },
    [todoManager, loadTodos]
  );

  const viewTodo = useCallback(
    async (todoId: number) => {
      if (!todoManager) return;

      try {
        setState((prev) => ({ ...prev, isLoading: true }));
        const todoDetails = await todoManager.viewTodo(todoId);
        setViewingTodo(todoDetails);
        setShowViewModal(true);
        setState((prev) => ({ ...prev, isLoading: false }));
      } catch (error) {
        console.error("Failed to load todo details:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionStatus: {
            message: `❌ Failed to load todo details: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            type: "error",
          },
        }));
      }
    },
    [todoManager]
  );

  const setFilter = useCallback((filter: "all" | "open" | "closed") => {
    setState((prev) => ({ ...prev, currentFilter: filter }));
  }, []);

  const updateSelectedLabels = useCallback((labels: Set<string>) => {
    setState((prev) => ({ ...prev, selectedLabels: labels }));
  }, []);

  const editTodo = useCallback(
    async (
      todoId: number,
      updates: {
        title: string;
        description: string;
        priority: "low" | "medium" | "high";
        labels: string[];
      }
    ) => {
      if (!todoManager) return;

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        // Prepare the update with priority label
        const priorityLabel = `priority: ${updates.priority}`;
        const allLabels = [priorityLabel, "todo", ...updates.labels];

        await todoManager.updateTodo(todoId, {
          title: updates.title,
          body: updates.description,
          labels: allLabels,
        });

        // Immediately reload todos
        await loadTodos();
        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionStatus: {
            message: "✅ Todo updated successfully!",
            type: "success",
          },
        }));
      } catch (error) {
        console.error("Failed to edit todo:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionStatus: {
            message: `❌ Failed to update todo: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            type: "error",
          },
        }));
        throw error;
      }
    },
    [todoManager, loadTodos]
  );

  const addCommentToTodo = useCallback(
    async (todoId: number, comment: string) => {
      if (!todoManager) return;

      try {
        const updatedTodo = await todoManager.addCommentToTodo(todoId, comment);
        setViewingTodo(updatedTodo);
        setState((prev) => ({
          ...prev,
          connectionStatus: {
            message: "✅ Comment added successfully!",
            type: "success",
          },
        }));
      } catch (error) {
        console.error("Failed to add comment:", error);
        setState((prev) => ({
          ...prev,
          connectionStatus: {
            message: `❌ Failed to add comment: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            type: "error",
          },
        }));
        throw error;
      }
    },
    [todoManager]
  );
  if (!state.isConnected) {
    return (
      <GitHubConfigComponent
        config={state.config}
        connectionStatus={state.connectionStatus}
        isLoading={state.isLoading}
        repositories={DEFAULT_REPOSITORIES}
        onConnect={connectToGitHub}
      />
    );
  }

  return (
    <TodoInterface
      todos={state.todos}
      labels={state.labels}
      currentFilter={state.currentFilter}
      selectedLabels={state.selectedLabels}
      isLoading={state.isLoading}
      config={state.config!}
      connectionStatus={state.connectionStatus}
      viewingTodo={viewingTodo}
      showViewModal={showViewModal}
      onCreateTodo={createTodo}
      onUpdateTodo={updateTodoState}
      onEditTodo={editTodo}
      onViewTodo={viewTodo}
      onAddComment={addCommentToTodo}
      onSetFilter={setFilter}
      onUpdateSelectedLabels={updateSelectedLabels}
      onSwitchRepository={switchRepository}
      onReloadLabels={() => loadLabels()}
      onCloseViewModal={() => {
        setShowViewModal(false);
        setViewingTodo(null);
      }}
    />
  );
}

export default App;
