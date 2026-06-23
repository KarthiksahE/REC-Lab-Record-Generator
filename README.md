# Full Stack Lab Record Generator

A production-quality Full Stack web application that allows users to generate professional Laboratory Records (Word DOCX and PDF) by submitting experiment data through a modern interface. 

The application strictly preserves the styling, fonts, margins, headers, and footers of the base Word template (`Lab_Record_Template.docx`). It uses **python-docx-template** for general context merging, programmatically duplicates experiment rows in memory, embeds transparent QR codes matching experiment GitHub repositories, and utilizes **LibreOffice Headless** to convert the output into high-fidelity PDFs.

---

## Folder Structure

```text
Rec Lab Record Generator/
├── backend/                       # Python FastAPI Backend
│   ├── app/
│   │   ├── api/                   # API Routers (Auth, Documents)
│   │   │   ├── auth.py
│   │   │   └── documents.py
│   │   ├── models/                # DB Models (Supabase connection)
│   │   │   └── database.py
│   │   ├── schemas/               # Input validation models (Pydantic)
│   │   │   └── document.py
│   │   ├── services/              # Business Logic Services
│   │   │   ├── auth_service.py    # Firebase Token Verification
│   │   │   ├── document_service.py# Template engine and row duplicating
│   │   │   └── supabase_service.py# DB CRUD & Bucket uploads
│   │   ├── utils/                 # Utility scripts
│   │   │   ├── pdf_converter.py   # Headless LibreOffice caller
│   │   │   └── qr_generator.py    # Transparent QR PNG creator
│   │   ├── config.py              # Pydantic configuration loader
│   │   └── main.py                # FastAPI entry point
│   ├── generated/                 # Temp directories for downloads
│   ├── templates/                 # Contains Lab_Record_Template.docx
│   ├── .env                       # Local environment variables
│   ├── .env.example               # Config template
│   ├── Dockerfile                 # Backend container definition
│   ├── requirements.txt           # Python packages list
│   ├── schema.sql                 # Supabase PostgreSQL tables script
│   └── test_generation.py         # Offline test runner
│
├── frontend/                      # Vite + React + Tailwind Frontend
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/              # global React context (Auth)
│   │   │   └── AuthContext.jsx
│   │   ├── pages/                 # Routing pages
│   │   │   ├── Dashboard.jsx      # Form inputs, preview iframe, saved records
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── services/              # API and Third-party config
│   │   │   ├── api.js             # Axios client with JWT auto-injection
│   │   │   └── firebase.js        # Auth initialization with mock fallbacks
│   │   ├── App.jsx                # Router, providers and route guards
│   │   ├── index.css              # Theme vars and Tailwind rules
│   │   └── main.jsx               # React DOM mounter
│   ├── .env                       # Client config
│   ├── .env.example               # Client config template
│   ├── Dockerfile                 # Frontend multi-stage container
│   ├── index.html                 # App layout with SEO metas
│   ├── package.json               # Node packages list
│   ├── postcss.config.js          # PostCSS configurations
│   └── tailwind.config.js         # Tailwind styling variables
│
├── docker-compose.yml             # Container Orchestrator configuration
└── README.md                      # Documentation
```

---

## Environment Variables

### Backend (`backend/.env`)

Create a `.env` file under the `backend/` directory:

| Key | Description | Default / Example |
|---|---|---|
| `HOST` | IP host for uvicorn server | `127.0.0.1` |
| `PORT` | Running port for backend | `8000` |
| `DEBUG` | Enables Swagger docs & mock overrides | `True` |
| `FIREBASE_PROJECT_ID` | Project ID from Firebase Console | `your-firebase-project-id` |
| `SUPABASE_URL` | API endpoint for Supabase | `https://[id].supabase.co` |
| `SUPABASE_KEY` | Supabase Anon Key | `your-supabase-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS for DB inserts) | `your-supabase-service-key` |
| `DATABASE_URL` | direct SQL pool connection string | `postgresql://postgres:[pw]@db.[id].supabase.co:5432/postgres` |
| `TEMPLATE_PATH` | Path to base template file | `templates/Lab_Record_Template.docx` |
| `LIBREOFFICE_PATH` | Path to LibreOffice `soffice` executable | `C:\Program Files\LibreOffice\program\soffice.exe` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:5173,http://127.0.0.1:5173` |

### Frontend (`frontend/.env`)

Create a `.env` file under the `frontend/` directory:

| Key | Description | Default / Example |
|---|---|---|
| `VITE_API_URL` | Base endpoint URL of backend server | `http://localhost:8000` |
| `VITE_FIREBASE_API_KEY` | Firebase API Key (Leave as-is to use Mock mode) | `your_api_key_here` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `project-id` |

---

## Installation Guide (Local Development)

### 1. Prerequisites
- **Python 3.10+** (Python 3.14.6 is tested and supported)
- **Node.js 18+** (Node v24 is tested and supported)
- **LibreOffice** (Required for DOCX → PDF conversion). Download and install it from [LibreOffice.org](https://www.libreoffice.org/).

### 2. Database Setup (Supabase)
Run the SQL queries in `backend/schema.sql` inside the **SQL Editor** on your Supabase Dashboard to instantiate the tables (`users`, `documents`, `download_history`).

### 3. Backend Setup
1. Open a terminal inside the `backend` folder:
   ```bash
   pip install -r requirements.txt
   ```
2. Set up the `.env` file using the variables defined above.
3. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
4. Swagger API interactive documentation will be active at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 4. Frontend Setup
1. Open another terminal inside the `frontend` folder:
   ```bash
   npm install
   ```
2. Configure the `frontend/.env` file. If `VITE_FIREBASE_API_KEY` is left as `your_api_key_here`, the application automatically boots into **Mock Authentication Mode**, storing dummy profile details inside `localStorage` and syncing them with the backend database. Any register email/password can be logged in instantly (default testing password: `password123`).
3. Start the React development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to [http://localhost:5173](http://localhost:5173).

---

## API Documentation

All endpoints require authentication. Pass the JWT Token in headers: `Authorization: Bearer <firebase_id_token>`.

### Authentication Sync
* **`POST /api/auth/sync`**
  Synchronizes authenticated user details. If the user doesn't exist in PostgreSQL, they are created.
* **`GET /api/auth/profile`**
  Retrieves profile information of the current logged-in user.

### Document Actions
* **`POST /api/documents/preview`**
  Generates a temporary PDF from form inputs. Returns the PDF file stream directly for client preview. Cleans up all files from server storage immediately after sending.
  * **Payload Schema:**
    ```json
    {
      "course_code": "CS23432",
      "course_name": "Software Construction",
      "student_name": "John Doe",
      "register_number": "211601001",
      "department": "AIML",
      "year": "II",
      "semester": "IV",
      "academic_year": "2025-2026",
      "experiments": [
        {
          "title": "Data Preprocessing using Pandas",
          "date": "10-01-2026",
          "github_url": "https://github.com/example/exp1"
        }
      ]
    }
    ```
* **`POST /api/documents/generate`**
  Main generation engine. Compiles DOCX and PDF, uploads them permanently to Supabase Storage bucket (`lab-records`), records metadata in PostgreSQL `documents` table, and returns the generated document DB structure with public URLs.
  * **Payload Schema:** (Same as `/preview` above)
* **`GET /api/documents`**
  Lists all saved records generated by the authenticated user.
* **`GET /api/documents/{id}`**
  Fetches details of a single saved record.
* **`DELETE /api/documents/{id}`**
  Removes a record from the database.
* **`POST /api/documents/{id}/download-log?file_type={docx|pdf}`**
  Logs a file download transaction in `download_history`.

---

## Deployment Guide (Docker Support)

The application provides complete multi-container Docker configuration ready for containerized staging/production environments.

### 1. Build and Run containers
Open a terminal in the root workspace directory (where `docker-compose.yml` resides) and run:
```bash
docker-compose up --build
```

- **Frontend Container:** Spins up an Nginx server on port `5173` serving the built React static files.
- **Backend Container:** Pulls a Debian slim python image, compiles and installs **LibreOffice headless**, installs dependencies, copies code, and binds port `8000`.

To stop the containers:
```bash
docker-compose down
```
