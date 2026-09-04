# Full Stack Lab Record Generator

A production-quality Full Stack web application that allows users to generate professional Laboratory Records (Word DOCX and PDF) by submitting experiment data through a modern interface. 

The application strictly preserves the styling, fonts, margins, headers, and footers of the base Word template (`Lab_Record_Template.docx`). It uses **python-docx-template** for general context merging, programmatically duplicates experiment rows in memory, embeds transparent QR codes matching experiment GitHub repositories, and utilizes **LibreOffice Headless** to convert the output into high-fidelity PDFs.

---

## Key Technical Features

### 1. High-Fidelity Responsive Inline PDF Preview (Vite + React)
- **Dynamic CDN Load**: Loaded fully on-demand from a CDN, avoiding large node packages or complex bundling steps.
- **Canvas-based Rendering**: Uses **PDF.js** to parse and render pages vertically in a custom scrollable viewport instead of standard `<iframe>` or `<object>` elements. This completely prevents empty/broken frames and download fallback popups in mobile browsers (like Chrome on Android or Safari on iOS).
- **High-DPI Scaling (Retina)**: Measures the parent element size using a `ResizeObserver` and scales the canvas rendering resolution dynamically (e.g., 2x target scale) to maintain razor-sharp font rendering and border edges on high-resolution displays.
- **Worker CORS Workaround**: Bypasses browser Same-Origin Policy (CORS) blocks on web workers by dynamically wrapping the cross-origin CDN worker script inside a local browser Blob URL using `importScripts`.

### 2. LibreOffice PDF Page Border Compatibility (FastAPI Backend)
- **Border Preservation**: Inspected Word templates often feature cover page borders (`w:pgBorders`) that LibreOffice headless parser omits by default during DOCX-to-PDF conversion on Linux/Render.
- **Offset Compatibility Fix**: The backend detects existing page borders in the template and programmatically forces their alignment style attribute to `offsetFrom="page"`. This ensures LibreOffice correctly draws first-page/cover-page borders in the output PDF without affecting margins, text padding, or layout alignments.

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
│  
│
├── frontend/                      # Vite + React + Tailwind Frontend
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
|   |   |   └── PdfViewer.jsx
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

For Vercel, configure these variables in **Project Settings > Environment Variables** rather than relying on a local `.env` file. In particular, `VITE_API_URL` must be the public Render URL, for example `https://your-service.onrender.com` (without a trailing slash). Rebuild and redeploy after changing Vite variables because they are embedded into the frontend at build time.

---

## Installation Guide (Local Development)

### 1. Prerequisites
- **Python 3.10+** (Python 3.14.6 is tested and supported)
- **Node.js 18+** (Node v24 is tested and supported)
- **LibreOffice** (Required for DOCX → PDF conversion). Download and install it from [LibreOffice.org](https://www.libreoffice.org/).

### 2. Database Setup (Supabase)
Run the SQL queries in `backend/schema.sql` inside the **SQL Editor** on your Supabase Dashboard to instantiate the tables (`users`, `documents`, `download_history`).

Firebase is the authentication provider in this project. Firebase accounts appear in Firebase Console, not in Supabase Authentication. The backend copies each authenticated Firebase account into the Supabase `public.users` table when `/api/auth/sync` succeeds. To enable that copy on Render, set `SUPABASE_URL` to the complete project URL (such as `https://abc123.supabase.co`) and set `SUPABASE_SERVICE_ROLE_KEY` to the server-only service-role key. Never expose that key in Vercel or frontend code.

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
  Synchronizes authenticated Firebase user details into the public `users` table. Firebase remains the identity provider; this endpoint does not create a second user in Supabase Authentication.
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

### Hosted deployment checklist

**Render backend environment variables:** set `FIREBASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ALLOWED_ORIGINS`. `ALLOWED_ORIGINS` must include the exact Vercel origin, such as `https://your-app.vercel.app`, alongside any local origins. Keep `DEBUG=False` in production.

**Vercel frontend environment variables:** set all `VITE_FIREBASE_*` values from the Firebase web app and set `VITE_API_URL` to the Render HTTPS URL. In Firebase Authentication, enable Google sign-in and add the Vercel hostname to Authorized domains.

After deploying, open the Render URL in a browser and confirm `/` returns `{"status":"healthy"}`. Then sign in and verify the new row under Supabase **Table Editor > public > users**. If sync fails, the API now returns the database error instead of reporting a false success.
