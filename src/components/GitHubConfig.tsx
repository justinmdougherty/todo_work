import { useState } from "react";
import { GitHubConfig as GitHubConfigType, Repository } from "../types";

interface Props {
  config: GitHubConfigType | null;
  connectionStatus: {
    message: string;
    type: "info" | "success" | "error";
  } | null;
  isLoading: boolean;
  repositories: Repository[];
  onConnect: (config: GitHubConfigType) => void;
}

export default function GitHubConfigComponent({
  config,
  connectionStatus,
  isLoading,
  repositories,
  onConnect,
}: Props) {
  const [token, setToken] = useState(config?.token || "");
  const [selectedRepo, setSelectedRepo] = useState(
    config?.currentRepo || repositories[0]
  );

  const handleConnect = () => {
    if (!token || !selectedRepo) {
      return;
    }

    const newConfig: GitHubConfigType = {
      token,
      currentRepo: selectedRepo,
      repositories,
    };

    onConnect(newConfig);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConnect();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="header-title">
            <h1>🚀 Todo Work</h1>
            <p>Manage your work todos with GitHub Issues</p>
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
        <div className="github-config">
          <div className="config-container">
            <h2>Connect to GitHub</h2>
            <div className="config-form">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="GitHub Personal Access Token"
                disabled={isLoading}
              />

              <select
                value={`${selectedRepo.owner}/${selectedRepo.name}`}
                onChange={(e) => {
                  const [owner, name] = e.target.value.split("/");
                  const repo = repositories.find(
                    (r) => r.owner === owner && r.name === name
                  );
                  if (repo) setSelectedRepo(repo);
                }}
                disabled={isLoading}
              >
                {repositories.map((repo) => (
                  <option
                    key={`${repo.owner}/${repo.name}`}
                    value={`${repo.owner}/${repo.name}`}
                  >
                    {repo.displayName} ({repo.owner}/{repo.name})
                  </option>
                ))}
              </select>

              <button
                onClick={handleConnect}
                disabled={isLoading || !token}
                className="btn-primary"
              >
                {isLoading ? "Connecting..." : "Connect to GitHub"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
