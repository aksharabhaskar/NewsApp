# 🚀 Project Setup & Run Guide

This guide will help you set up the NewsApp project on your local machine using the automated setup scripts.

## ✅ Prerequisites

Before running the scripts, ensure you have:

1.  **Docker Desktop** installed and running. ([Download Here](https://www.docker.com/products/docker-desktop/))
2.  **API Keys** ready:
    *   **NewsAPI Key**: Get it for free at [newsapi.org](https://newsapi.org/)
    *   **Gemini API Key**: Get it for free at [aistudio.google.com](https://aistudio.google.com/)

---

## 🛠️ Step 1: Run the Setup Script

We have provided automated scripts to configure your environment (`.env`) and start the application.

### 🪟 For Windows Users
1.  Open the project folder.
2.  Right-click on the file named `setup.ps1`.
3.  Select **"Run with PowerShell"**.
    *   *Alternatively, open a terminal in the folder and type: `.\setup.ps1`*

### 🍎/🐧 For Mac & Linux Users
1.  Open your terminal.
2.  Navigate to the project folder (`cd path/to/folder`).
3.  Run the following commands:
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```

**What the script does:**
*   Checks if Docker is installed and running.
*   Asks for your **NewsAPI** and **Gemini API** keys (only the first time).
*   Creates the `.env` configuration file automatically.
*   Stops any conflicting containers (like old versions).
*   Builds and starts the Docker containers.

---

## 🌐 Step 2: Access the Application

Once the script finishes and the terminal shows "Uvicorn running", you can access the app:

*   👉 **Frontend (News Feed):** [http://localhost:8085](http://localhost:8085)
*   👉 **Backend (API Docs):** [http://localhost:5005/docs](http://localhost:5005/docs)

---

## 🛑 Management Commands

### Stopping the App
To stop the application, go to the terminal where it's running and press:
**`Ctrl + C`**

Or run this command in a new terminal:
```bash
docker-compose down
```

### Restarting the App (Daily Usage)
You don't need to run the setup script every time. To start the app again later, just run:
```bash
docker-compose up
```

---

## ⚠️ Troubleshooting

**"Port is already allocated"**
If you see an error about ports `5005` or `8085` being in use:
1.  Run `docker-compose down` to clear old containers.
2.  Restart Docker Desktop.

**"Docker is not running"**
Make sure the Docker Desktop app is open and the whale icon is visible in your taskbar/menu bar.
