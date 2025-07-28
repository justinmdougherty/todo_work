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
  viewingTodo: any;
  showViewModal: boolean;
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
  onEditTodo: (
    todoId: number,
    updates: {
      title: string;
      description: string;
      priority: "low" | "medium" | "high";
      labels: string[];
    }
  ) => Promise<void>;
  onViewTodo: (todoId: number) => Promise<void>;
  onAddComment: (todoId: number, comment: string) => Promise<void>;
  onSetFilter: (filter: "all" | "open" | "closed") => void;
  onUpdateSelectedLabels: (labels: Set<string>) => void;
  onSwitchRepository: (repo: Repository) => Promise<void>;
  onReloadLabels: () => Promise<void>;
  onCloseViewModal: () => void;
}

export default function TodoInterface({
  todos,
  labels,
  currentFilter,
  selectedLabels,
  isLoading,
  config,
  connectionStatus,
  viewingTodo,
  showViewModal,
  onCreateTodo,
  onUpdateTodo,
  onEditTodo,
  onViewTodo,
  onAddComment,
  onSetFilter,
  onUpdateSelectedLabels,
  onSwitchRepository,
  onCloseViewModal,
}: Props) {
  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [newIssueForm, setNewIssueForm] = useState({
    title: "",
    description: "",
    priority: "low" as "low" | "medium" | "high",
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "low" as "low" | "medium" | "high",
  });
  const [editSelectedLabels, setEditSelectedLabels] = useState<Set<string>>(
    new Set()
  );
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

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
    action: "complete" | "reopen" | "delete" | "view" | "edit"
  ) => {
    try {
      if (action === "view") {
        await onViewTodo(todoId);
      } else if (action === "edit") {
        const todo = todos.find((t) => t.number === todoId);
        if (todo) {
          openEditModal(todo);
        }
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

  const openEditModal = (todo: TodoItem) => {
    setEditingTodo(todo);
    setEditForm({
      title: todo.title,
      description: todo.body || "",
      priority: todo.priority,
    });

    // Set current labels for editing
    const currentLabels = new Set(
      todo.labels
        .filter(
          (label) =>
            !label.name.toLowerCase().startsWith("priority:") &&
            !label.name.toLowerCase().includes("todo") &&
            !label.name.toLowerCase().includes("deleted")
        )
        .map((label) => label.name)
    );
    setEditSelectedLabels(currentLabels);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTodo(null);
    setEditForm({ title: "", description: "", priority: "low" });
    setEditSelectedLabels(new Set());
  };

  const handleSaveEdit = async () => {
    if (!editingTodo || !editForm.title.trim()) {
      alert("Please enter a title");
      return;
    }

    try {
      await onEditTodo(editingTodo.number, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        labels: Array.from(editSelectedLabels),
      });

      closeEditModal();
    } catch (error) {
      alert(
        `Failed to update todo: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleAddComment = async () => {
    if (!viewingTodo || !newComment.trim()) {
      alert("Please enter a comment");
      return;
    }

    try {
      setIsAddingComment(true);
      await onAddComment(viewingTodo.number, newComment);
      setNewComment("");
    } catch (error) {
      alert(
        `Failed to add comment: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsAddingComment(false);
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
                              handleTodoAction(todo.number, "edit")
                            }
                          >
                            ✏️ Edit
                          </button>
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

      {/* Edit Todo Modal */}
      {showEditModal && editingTodo && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div
            className="modal-content new-issue-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Edit Issue #{editingTodo.number}</h3>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="new-issue-form">
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((prev) => ({
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
                      value={editForm.priority}
                      onChange={(e) =>
                        setEditForm((prev) => ({
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
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({
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
                      const isSelected = editSelectedLabels.has(label.name);
                      return (
                        <div
                          key={label.name}
                          className={`label-option-compact ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => {
                            const newSelected = new Set(editSelectedLabels);
                            if (newSelected.has(label.name)) {
                              newSelected.delete(label.name);
                            } else {
                              newSelected.add(label.name);
                            }
                            setEditSelectedLabels(newSelected);
                          }}
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
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Todo Modal */}
      {showViewModal && viewingTodo && (
        <div className="modal-overlay" onClick={onCloseViewModal}>
          <div
            className="modal-content view-todo-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                Issue #{viewingTodo.number}: {viewingTodo.title}
              </h3>
              <button className="modal-close" onClick={onCloseViewModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="view-todo-content">
                {/* Issue Status and Priority */}
                <div className="todo-status-section">
                  <div className="todo-status-badges">
                    <span
                      className={`todo-status-badge ${
                        viewingTodo.state === "open"
                          ? "status-open"
                          : "status-closed"
                      }`}
                    >
                      {viewingTodo.state === "open" ? "🟢 Open" : "🔴 Closed"}
                    </span>
                    <span
                      className={`todo-priority priority-${viewingTodo.priority}`}
                    >
                      {viewingTodo.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <div className="todo-meta-info">
                    <p>
                      Created:{" "}
                      {new Date(viewingTodo.created_at).toLocaleDateString()} at{" "}
                      {new Date(viewingTodo.created_at).toLocaleTimeString()}
                    </p>
                    {viewingTodo.updated_at !== viewingTodo.created_at && (
                      <p>
                        Updated:{" "}
                        {new Date(viewingTodo.updated_at).toLocaleDateString()}{" "}
                        at{" "}
                        {new Date(viewingTodo.updated_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Labels */}
                {viewingTodo.labels && viewingTodo.labels.length > 0 && (
                  <div className="todo-labels-section">
                    <h4>Labels</h4>
                    <div className="todo-labels">
                      {viewingTodo.labels
                        .filter(
                          (label: any) =>
                            !label.name.toLowerCase().startsWith("priority:") &&
                            !label.name.toLowerCase().includes("todo") &&
                            !label.name.toLowerCase().includes("deleted")
                        )
                        .map((label: any) => (
                          <span
                            key={label.name}
                            className="todo-label"
                            style={{ backgroundColor: `#${label.color}` }}
                          >
                            {label.name}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {viewingTodo.body && (
                  <div className="todo-description-section">
                    <h4>Description</h4>
                    <div className="todo-description-content">
                      {viewingTodo.body}
                    </div>
                  </div>
                )}

                {/* Comments */}
                {viewingTodo.comments && viewingTodo.comments.length > 0 && (
                  <div className="todo-comments-section">
                    <h4>Comments ({viewingTodo.comments.length})</h4>
                    <div className="todo-comments">
                      {viewingTodo.comments.map((comment: any) => (
                        <div key={comment.id} className="todo-comment">
                          <div className="comment-header">
                            <div className="comment-author">
                              <img
                                src={comment.user.avatar_url}
                                alt={comment.user.login}
                                className="comment-avatar"
                              />
                              <span className="comment-username">
                                {comment.user.login}
                              </span>
                            </div>
                            <span className="comment-date">
                              {new Date(
                                comment.created_at
                              ).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(
                                comment.created_at
                              ).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="comment-body">{comment.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewingTodo.comments && viewingTodo.comments.length === 0 && (
                  <div className="no-comments">
                    <p>No comments yet.</p>
                  </div>
                )}

                {/* Add Comment Section */}
                <div className="add-comment-section">
                  <h4>Add a Comment</h4>
                  <div className="comment-form">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Leave a comment..."
                      className="comment-input"
                      rows={4}
                    />
                    <div className="comment-form-actions">
                      <button
                        className="btn-primary"
                        onClick={handleAddComment}
                        disabled={isAddingComment || !newComment.trim()}
                      >
                        {isAddingComment ? "Adding..." : "Add Comment"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => {
                  const commentInput = document.querySelector(
                    ".comment-input"
                  ) as HTMLTextAreaElement;
                  if (commentInput) {
                    commentInput.focus();
                    commentInput.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }
                }}
              >
                💬 Add Comment
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleTodoAction(viewingTodo.number, "edit")}
              >
                ✏️ Edit Issue
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  const repo = config.currentRepo;
                  const issueUrl = `https://github.com/${repo.owner}/${repo.name}/issues/${viewingTodo.number}`;
                  window.open(issueUrl, "_blank");
                }}
              >
                🔗 View on GitHub
              </button>
              <button className="btn-secondary" onClick={onCloseViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
