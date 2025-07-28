import { useState } from "react";
import { TodoItem, GitHubLabel, GitHubConfig, Repository } from "../types";

interface Props {
  todos: TodoItem[];
  labels: GitHubLabel[];
  currentFilter: "all" | "open" | "closed";
  selectedLabels: Set<string>;
  isLoading: boolean;
  config: GitHubConfig;
  connectionStatus: {
    message: string;
    type: "info" | "success" | "error";
  } | null;
  onCreateTodo: (
    title: string,
    description: string,
    priority: "low" | "medium" | "high",
    labels: string[]
  ) => Promise<void>;
  onUpdateTodo: (
    todoId: number,
    action: "complete" | "reopen" | "delete"
  ) => Promise<void>;
  onViewTodo: (todoId: number) => Promise<void>;
  onSetFilter: (filter: "all" | "open" | "closed") => void;
  onUpdateSelectedLabels: (labels: Set<string>) => void;
  onSwitchRepository: (repo: Repository) => Promise<void>;
  onReloadLabels: () => Promise<void>;
}

export default function TodoInterface({
  todos,
  labels,
  currentFilter,
  selectedLabels,
  isLoading,
  config,
  connectionStatus,
  onCreateTodo,
  onUpdateTodo,
  onViewTodo,
  onSetFilter,
  onUpdateSelectedLabels,
  onSwitchRepository,
}: Props) {
  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [newIssueForm, setNewIssueForm] = useState({
    title: "",
    description: "",
    priority: "low" as "low" | "medium" | "high",
  });

  const filteredTodos = todos.filter((todo) => {
    switch (currentFilter) {
      case "open":
        return todo.state === "open";
      case "closed":
        return todo.state === "closed";
      default:
        return true;
    }
  });

  const openCount = todos.filter((t) => t.state === "open").length;
  const closedCount = todos.filter((t) => t.state === "closed").length;

  const handleCreateIssue = async () => {
    if (!newIssueForm.title.trim()) {
      alert("Please enter an issue title");
      return;
    }

    try {
      await onCreateTodo(
        newIssueForm.title,
        newIssueForm.description,
        newIssueForm.priority,
        Array.from(selectedLabels)
      );

      setNewIssueForm({ title: "", description: "", priority: "low" });
      setShowNewIssueModal(false);
      onUpdateSelectedLabels(new Set());
    } catch (error) {
      alert(
        `Failed to create issue: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleTodoAction = async (
    todoId: number,
    action: "complete" | "reopen" | "delete" | "view"
  ) => {
    try {
      if (action === "view") {
        await onViewTodo(todoId);
      } else if (action === "delete") {
        if (confirm("Are you sure you want to delete this todo?")) {
          await onUpdateTodo(todoId, action);
        }
      } else {
        await onUpdateTodo(todoId, action);
      }
    } catch (error) {
      alert(
        `Failed to ${action} todo: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const toggleLabel = (labelName: string) => {
    const newSelected = new Set(selectedLabels);
    if (newSelected.has(labelName)) {
      newSelected.delete(labelName);
    } else {
      newSelected.add(labelName);
    }
    onUpdateSelectedLabels(newSelected);
  };

  const extractPriority = (
    labels: GitHubLabel[]
  ): "low" | "medium" | "high" => {
    const priorityLabel = labels.find(
      (label) =>
        label.name.toLowerCase().includes("priority") ||
        ["low", "medium", "high"].includes(label.name.toLowerCase())
    );

    if (priorityLabel) {
      const name = priorityLabel.name.toLowerCase();
      if (name.includes("high")) return "high";
      if (name.includes("medium")) return "medium";
      if (name.includes("low")) return "low";
    }

    return "low";
  };

  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155 ? "#000000" : "#ffffff";
  };

  const nonPriorityLabels = labels.filter(
    (label) =>
      !label.name.toLowerCase().startsWith("priority:") &&
      !label.name.toLowerCase().includes("todo") &&
      !label.name.toLowerCase().includes("deleted")
  );

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="header-title">
            <h1>🚀 Todo Work</h1>
            <p>Current: {config.currentRepo.displayName}</p>
            <select
              value={`${config.currentRepo.owner}/${config.currentRepo.name}`}
              onChange={(e) => {
                const [owner, name] = e.target.value.split("/");
                const repo = config.repositories.find(
                  (r) => r.owner === owner && r.name === name
                );
                if (repo && repo !== config.currentRepo) {
                  onSwitchRepository(repo);
                }
              }}
              disabled={isLoading}
              className="repo-switcher"
            >
              {config.repositories.map((repo) => (
                <option
                  key={`${repo.owner}/${repo.name}`}
                  value={`${repo.owner}/${repo.name}`}
                >
                  {repo.displayName}
                </option>
              ))}
            </select>
          </div>
          {connectionStatus && (
            <div
              className={`connection-status status ${connectionStatus.type}`}
            >
              {connectionStatus.message}
            </div>
          )}
        </div>
      </header>

      <main className="main">
        <div className="todo-interface">
          <div className="issues-header">
            <div className="issues-header-content">
              <div className="issues-title">
                <h2>Issues</h2>
                <span className="issues-count">{openCount} Open</span>
              </div>
              <button
                onClick={() => setShowNewIssueModal(true)}
                className="btn-primary new-issue-btn"
              >
                New issue
              </button>
            </div>
          </div>

          <div className="issues-toolbar">
            <div className="toolbar-left">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${
                    currentFilter === "open" ? "active" : ""
                  }`}
                  onClick={() => onSetFilter("open")}
                >
                  {openCount} Open
                </button>
                <button
                  className={`filter-tab ${
                    currentFilter === "closed" ? "active" : ""
                  }`}
                  onClick={() => onSetFilter("closed")}
                >
                  {closedCount} Closed
                </button>
              </div>
            </div>
          </div>

          <div className="issues-listing">
            <div className="issues-container">
              {isLoading ? (
                <div className="loading-state">
                  <p>Loading issues...</p>
                </div>
              ) : filteredTodos.length === 0 ? (
                <div className="loading-state">
                  <p>No issues found. Create your first issue!</p>
                </div>
              ) : (
                filteredTodos.map((todo) => {
                  const priority = extractPriority(todo.labels);
                  const isCompleted = todo.state === "closed";
                  const todoLabels = todo.labels.filter(
                    (label) =>
                      !label.name.toLowerCase().startsWith("priority:") &&
                      !label.name.toLowerCase().includes("todo") &&
                      !label.name.toLowerCase().includes("deleted")
                  );

                  return (
                    <div
                      key={todo.number}
                      className={`todo-item ${isCompleted ? "completed" : ""}`}
                    >
                      <div className="todo-header">
                        <div className="todo-title-section">
                          <h3 className="todo-title">{todo.title}</h3>
                          {todoLabels.length > 0 && (
                            <div className="todo-labels">
                              {todoLabels.map((label) => (
                                <span
                                  key={label.name}
                                  className="todo-label"
                                  style={{ backgroundColor: `#${label.color}` }}
                                >
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="todo-actions-inline">
                          <span
                            className={`todo-priority priority-${priority}`}
                          >
                            {priority}
                          </span>
                        </div>
                      </div>
                      {todo.body && (
                        <p className="todo-description">{todo.body}</p>
                      )}
                      <div className="todo-meta">
                        <span>
                          Created:{" "}
                          {new Date(todo.created_at).toLocaleDateString()}
                        </span>
                        <div className="todo-actions">
                          {!isCompleted ? (
                            <button
                              className="btn-small btn-secondary"
                              onClick={() =>
                                handleTodoAction(todo.number, "complete")
                              }
                            >
                              ✓ Complete
                            </button>
                          ) : (
                            <button
                              className="btn-small btn-secondary"
                              onClick={() =>
                                handleTodoAction(todo.number, "reopen")
                              }
                            >
                              ↻ Reopen
                            </button>
                          )}
                          <button
                            className="btn-small btn-secondary"
                            onClick={() =>
                              handleTodoAction(todo.number, "view")
                            }
                          >
                            👁 View
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={() =>
                              handleTodoAction(todo.number, "delete")
                            }
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* New Issue Modal */}
      {showNewIssueModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowNewIssueModal(false)}
        >
          <div
            className="modal-content new-issue-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Create new issue</h3>
              <button
                className="modal-close"
                onClick={() => setShowNewIssueModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="new-issue-form">
                <input
                  type="text"
                  value={newIssueForm.title}
                  onChange={(e) =>
                    setNewIssueForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="issue-title-input"
                  placeholder="Title"
                  autoFocus
                />
                <div className="issue-form-sidebar">
                  <div className="sidebar-section">
                    <h4>Priority</h4>
                    <select
                      value={newIssueForm.priority}
                      onChange={(e) =>
                        setNewIssueForm((prev) => ({
                          ...prev,
                          priority: e.target.value as "low" | "medium" | "high",
                        }))
                      }
                      className="priority-select"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
                <textarea
                  value={newIssueForm.description}
                  onChange={(e) =>
                    setNewIssueForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="issue-description-input"
                  placeholder="Add a description"
                />

                <div className="modal-labels-panel">
                  <div className="labels-header">
                    <h4>Choose Labels</h4>
                    <span className="labels-count">
                      {nonPriorityLabels.length} labels
                    </span>
                  </div>
                  <div className="labels-grid">
                    {nonPriorityLabels.map((label) => {
                      const isSelected = selectedLabels.has(label.name);
                      return (
                        <div
                          key={label.name}
                          className={`label-option-compact ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => toggleLabel(label.name)}
                          style={
                            isSelected
                              ? {
                                  backgroundColor: `#${label.color}`,
                                  color: getContrastColor(label.color),
                                }
                              : {
                                  borderColor: `#${label.color}`,
                                  color: `#${label.color}`,
                                }
                          }
                        >
                          {label.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowNewIssueModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateIssue}>
                Create issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
