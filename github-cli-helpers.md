# GitHub CLI Helper Commands

This document contains useful GitHub CLI commands for managing the todo_work repository.

## GitHub CLI Path
```powershell
"C:\gh-cli\bin\gh.exe"
```

## Label Management

### List existing labels
```powershell
& "C:\gh-cli\bin\gh.exe" label list
```

### Create project labels
```powershell
# Technical labels
& "C:\gh-cli\bin\gh.exe" label create "LBHH" --description "Lightning BOLT Hand Held related tasks" --color "FF6B6B"
& "C:\gh-cli\bin\gh.exe" label create "FW" --description "Firmware related tasks" --color "4ECDC4"
& "C:\gh-cli\bin\gh.exe" label create "WF" --description "Waveform related tasks" --color "45B7D1"
& "C:\gh-cli\bin\gh.exe" label create "Hardware" --description "Hardware related tasks and issues" --color "96CEB4"

# Project labels
& "C:\gh-cli\bin\gh.exe" label create "SOCOM" --description "SOCOM related requirements and tasks" --color "FFEAA7"
& "C:\gh-cli\bin\gh.exe" label create "TBI" --description "TBI related tasks and requirements" --color "DDA0DD"
& "C:\gh-cli\bin\gh.exe" label create "HAWK" --description "HAWK system related tasks" --color "98D8C8"
& "C:\gh-cli\bin\gh.exe" label create "ELERA-C" --description "ELERA-C related tasks and development" --color "F7DC6F"

# Process labels
& "C:\gh-cli\bin\gh.exe" label create "Test Plan" --description "Test planning and execution tasks" --color "BB8FCE"
& "C:\gh-cli\bin\gh.exe" label create "Battery Study" --description "Battery analysis and power management tasks" --color "85C1E9"
& "C:\gh-cli\bin\gh.exe" label create "Ordering" --description "Parts ordering and procurement tasks" --color "F8C471"
& "C:\gh-cli\bin\gh.exe" label create "Cost Estimate" --description "Cost estimation and budgeting tasks" --color "82E0AA"
& "C:\gh-cli\bin\gh.exe" label create "SOW" --description "Statement of Work related tasks" --color "F1948A"
```

### Delete a label
```powershell
& "C:\gh-cli\bin\gh.exe" label delete "LabelName"
```

## Issue Management

### Create a new issue/todo
```powershell
& "C:\gh-cli\bin\gh.exe" issue create --title "Issue Title" --body "Issue description" --label "priority: medium,LBHH,FW"
```

### List issues
```powershell
# All issues
& "C:\gh-cli\bin\gh.exe" issue list

# Open issues only
& "C:\gh-cli\bin\gh.exe" issue list --state open

# Issues with specific label
& "C:\gh-cli\bin\gh.exe" issue list --label "LBHH"
```

### Edit an issue
```powershell
& "C:\gh-cli\bin\gh.exe" issue edit [ISSUE_NUMBER] --add-label "NewLabel"
& "C:\gh-cli\bin\gh.exe" issue edit [ISSUE_NUMBER] --remove-label "OldLabel"
& "C:\gh-cli\bin\gh.exe" issue edit [ISSUE_NUMBER] --title "New Title"
```

### Close an issue
```powershell
& "C:\gh-cli\bin\gh.exe" issue close [ISSUE_NUMBER]
```

### Reopen an issue
```powershell
& "C:\gh-cli\bin\gh.exe" issue reopen [ISSUE_NUMBER]
```

## Repository Information

### View repository details
```powershell
& "C:\gh-cli\bin\gh.exe" repo view
```

### View repository in browser
```powershell
& "C:\gh-cli\bin\gh.exe" repo view --web
```

## Authentication

### Check authentication status
```powershell
& "C:\gh-cli\bin\gh.exe" auth status
```

### Login (if needed)
```powershell
& "C:\gh-cli\bin\gh.exe" auth login
```

## Examples

### Create a firmware task
```powershell
& "C:\gh-cli\bin\gh.exe" issue create --title "Update LBHH firmware for new waveform" --body "Need to implement new waveform processing in the firmware" --label "priority: high,LBHH,FW,WF"
```

### Create a hardware ordering task
```powershell
& "C:\gh-cli\bin\gh.exe" issue create --title "Order components for HAWK prototype" --body "Need to order resistors, capacitors, and connectors for the new prototype" --label "priority: medium,HAWK,Hardware,Ordering"
```

### Create a test planning task
```powershell
& "C:\gh-cli\bin\gh.exe" issue create --title "Develop test plan for SOCOM requirements" --body "Create comprehensive test plan covering all SOCOM requirements" --label "priority: high,SOCOM,Test Plan"
```
