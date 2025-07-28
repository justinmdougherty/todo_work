# 🚀 Todo Work - GitHub Issues Manager

A modern web application for managing work todos using GitHub Issues as the backend. This application provides a clean, intuitive interface for creating, managing, and tracking todo items that are synchronized with your GitHub repository issues.

## ✨ Features

- **GitHub Integration**: Connect directly to your GitHub repository
- **Issue Management**: Create, complete, reopen, and delete todos as GitHub issues
- **Priority System**: Organize todos with low, medium, and high priority labels
- **Filtering**: View all todos, only open items, or completed items
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Automatic theme switching based on system preferences
- **Local Storage**: Saves your GitHub configuration for quick access

## 🎯 Use Cases

- **Personal Task Management**: Use GitHub issues to track your personal work items
- **Project Planning**: Organize project tasks with priority levels
- **Team Collaboration**: Share todo lists through GitHub's collaboration features
- **Issue Tracking**: Convert todos into full GitHub issues with discussions and labels

## 🛠️ Setup

### Prerequisites

- Node.js (version 16 or higher)
- A GitHub account
- A GitHub repository (like `justinmdougherty/todo_work`)

### Installation

1. **Clone or download this repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Open your browser** and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### GitHub Configuration

1. **Create a GitHub Personal Access Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Select the following scopes:
     - `repo` (Full control of private repositories)
     - `public_repo` (Access public repositories)
   - Copy the generated token

2. **Configure the Application**:
   - Enter your GitHub token in the app
   - Set the repository owner (e.g., `justinmdougherty`)
   - Set the repository name (e.g., `todo_work`)
   - Click "Connect to GitHub"

## 📱 Usage

### Creating Todos
1. Fill in the todo title (required)
2. Add an optional description
3. Select priority level (low, medium, high)
4. Click "Add Todo"

### Managing Todos
- **Complete**: Mark a todo as done (closes the GitHub issue)
- **Reopen**: Reopen a completed todo
- **View**: Open the GitHub issue in a new tab
- **Delete**: Close the issue and mark it as deleted

### Filtering
- **All**: Show all todos regardless of status
- **Open**: Show only incomplete todos
- **Completed**: Show only completed todos

## 🔧 Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Build Tool**: Vite for fast development and building
- **API**: GitHub REST API v3
- **Storage**: Local storage for configuration persistence

### File Structure
```
src/
├── main.js          # Main application logic and UI handling
├── github-api.js    # GitHub API wrapper class
├── todo-manager.js  # Todo management logic
└── style.css        # Application styles
```

### GitHub API Integration
The application uses GitHub's REST API to:
- Create issues as todos
- Update issue states (open/closed)
- Add priority labels automatically
- Retrieve issue lists and details

## 🎨 Customization

### Priority Labels
The app automatically creates these labels in your repository:
- `priority: low` (green)
- `priority: medium` (yellow)
- `priority: high` (red)

### Styling
The application uses a GitHub-inspired dark/light theme that automatically adapts to your system preferences. You can customize colors and styles in `src/style.css`.

## 🔒 Security Notes

- **Token Storage**: GitHub tokens are stored in browser local storage
- **Permissions**: Only request necessary GitHub permissions
- **HTTPS**: Always use HTTPS in production
- **Token Scope**: Use minimal required scopes for your tokens

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

### Deployment Options
- **GitHub Pages**: Perfect for GitHub-hosted projects
- **Netlify**: Easy deployment with continuous integration
- **Vercel**: Fast global deployment
- **Any static hosting**: Upload the `dist/` folder contents

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Troubleshooting

### Common Issues

**"Connection failed"**
- Check your GitHub token has the correct permissions
- Verify the repository owner and name are correct
- Ensure the repository exists and you have access

**"No todos found"**
- The repository might not have any issues yet
- Check if issues are disabled in the repository settings
- Try creating a todo to test the connection

**"Rate limit exceeded"**
- GitHub API has rate limits for authenticated requests
- Wait for the rate limit to reset (usually 1 hour)
- Consider using a different token or repository

## 📞 Support

For questions or support:
1. Check the [GitHub Issues](https://github.com/justinmdougherty/todo_work/issues) page
2. Create a new issue with detailed information
3. Include error messages and browser console logs

---

**Happy todo managing! 🎉**
