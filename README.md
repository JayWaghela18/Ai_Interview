# AI Interview MVP Platform

An interactive, AI-powered mock interview web application featuring a modern frontend and a Python backend.

---

## Features

* **Interactive Landing Page**: Modern user interface featuring hero sections, feature showcases, interactive portals, and a custom robot mascot (`AetherPortal`, `RobotMascot`).


* **Complete Interview Workflow**: Dedicated routes and views designed for uploading resumes or materials, running the interview session, reviewing processing and analysis states, and tracking performance results.


* **Python Backend**: Includes a modular Python backend service configured with a `requirements.txt` file.



---

## Project Structure

```text
Ai_Interview-mvp-development/
├── backend/                  # Python backend services and APIs[cite: 2]
│   ├── main.py               # Main application entry point[cite: 2]
│   └── requirements.txt      # Python dependencies[cite: 2]
├── public/                   # Static public assets[cite: 2]
├── src/                      # Frontend source code[cite: 2]
│   ├── assets/               # Images and graphics (e.g., robot mascot, aether)[cite: 2]
│   ├── components/           # Reusable UI elements (Landing, Robot, UI primitives)[cite: 2]
│   ├── hooks/                # Custom React hooks (e.g., use-mobile)[cite: 2]
│   ├── lib/                  # Utility functions and error-reporting wrappers[cite: 2]
│   ├── routes/               # Application pages (index, upload, interview, analyzing, results)[cite: 2]
│   ├── router.tsx            # Router configurations[cite: 2]
│   ├── server.ts             # Server entry/configurations[cite: 2]
│   └── styles.css            # Global application stylesheets[cite: 2]
├── package.json              # Node.js dependencies and scripts[cite: 2]
└── vite.config.ts            # Vite configuration[cite: 2]

```

---

## Tech Stack

* **Frontend**: React, Vite, TypeScript, Tailwind CSS, Radix UI components


* **Backend**: Python (with dependency management via `requirements.txt`)


* **Package Management**: Bun / npm



---

## Getting Started

### Prerequisites

* Node.js / Bun


* Python 3.12+



### Installation & Running

1. **Clone the repository** and navigate to the project directory.


2. **Install Frontend Dependencies**:
```bash
bun install
# or
npm install

```


3. **Set up and Run the Backend**:
Navigate to the `backend` folder, install the required python packages, and start the development server using Uvicorn:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The upload endpoint extracts selectable text from PDFs. Scanned or image-only
PDFs must be OCR-processed before uploading; otherwise the API will return a
clear validation error instead of sending empty text to the AI parser.


4. **Run the Development Server (Frontend)**:
Open a separate terminal window in the root directory and run:
```bash
bun run dev
# or
npm run dev

```
