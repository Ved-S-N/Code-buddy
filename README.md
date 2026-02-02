# DSA Buddy 🧠

A Chrome Extension that helps you solve DSA problems on LeetCode and Codeforces by giving you 3 progressive hints using AI (Gemini), without giving away the full solution.

## 📁 Project Structure

```
dsa-buddy-extension/   # Chrome Extension Source
server/                # Node.js Backend Server
```

## 🚀 Setup Instructions

### 1. Backend Setup

1.  Navigate to the `server` folder:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Configure API Key**:
    *   Rename `.env.example` to `.env`.
    *   Open `.env` and paste your Gemini API Key.
    *   Get a key here: [Google AI Studio](https://aistudio.google.com/app/apikey)
4.  Start the server:
    ```bash
    npm start
    ```
    *   The server should be running on `http://localhost:3000`.

### 2. Chrome Extension Setup

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (top right toggle).
3.  Click **Load unpacked**.
4.  Select the `dsa-buddy-extension` folder.
5.  Navigate to a LeetCode or Codeforces problem.
6.  Click the Extension Icon (Puzzle piece) -> DSA Buddy.
    *   *Tip: Pin the extension for easy access.*
7.  The side panel will open. Click **Get Hints**!

## ✨ Features

*   **Progressive Hints**: Get stuck? Get a small nudge first, then a logic hint, then an implementation detail.
*   **Context Aware**: Reads the problem title, description, and *your current code* from the page.
*   **Strictly No Solutions**: The AI is prompted to guide you, not solve it for you.

## 🛠 Troubleshooting

*   **"Server Error"**: Make sure the Node.js server is running and the `.env` file has a valid API key.
*   **"Problem not detected"**: Refresh the browser page. Ensure you are on a problem page (e.g., `leetcode.com/problems/...`).
*   **Code not reading**: Ensure the code editor is visible on the screen.

## ⚠️ Note
This is a learning tool. 
- **LeetCode**: Works best on the standard "Problems" view.
- **Codeforces**: Works on the problem view.
