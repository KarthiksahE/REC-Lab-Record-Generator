import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  LogOut,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  FileText,
  Download,
  Eye,
  RefreshCw,
  FolderOpen,
  Info,
  CheckCircle,
  Loader2,
  FileSpreadsheet,
  Settings,
  Save,
  Calendar,
  Link as LinkIcon
} from "lucide-react";
import PdfViewer from "../components/PdfViewer";

const extractStudentMeta = (userOrName) => {
  if (!userOrName) return { name: "", reg: "" };
  let displayName = typeof userOrName === "string" ? userOrName : (userOrName.displayName || "");
  let email = typeof userOrName === "string" ? "" : (userOrName.email || "");
  
  let name = displayName;
  let reg = "";

  // 1. Try to find 6-12 consecutive digits in name
  const nameDigits = name.match(/\b\d{6,12}\b/);
  if (nameDigits) {
    reg = nameDigits[0];
    name = name.replace(reg, "").replace(/[()]/g, "").trim();
  }

  // 2. Try to find 6-12 consecutive digits in email if not in name
  if (!reg && email) {
    const emailDigits = email.match(/\d{6,12}/);
    if (emailDigits) {
      reg = emailDigits[0];
    }
  }

  // 3. Fallback name from email
  if (!name && email) {
    const emailPart = email.split("@")[0];
    const namePart = emailPart.replace(/\d+/g, "").replace(/[._-]/g, " ").trim();
    name = namePart.toUpperCase();
  }

  // Double clean name from parentheses or extra spaces
  name = name.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
  return { name, reg };
};

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // Form states
  const [docInfo, setDocInfo] = useState({
    course_title_code: "",
    student_name: "",
    register_number: "",
    department: "AIML",
    year: "II",
    semester: "IV",
    academic_year: "2025-2026"
  });

  const [experiments, setExperiments] = useState([
    {
      title: "",
      date: "",
      github_url: ""
    }
  ]);

  // UI state
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [savedRecords, setSavedRecords] = useState([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("form"); // 'form' or 'records' (for mobile responsive layouts)

  const dropdownRef = useRef(null);

  // Helper to format date for native date input
  const getFormattedDateForInput = (dateStr) => {
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const parts = dateStr.split("-");
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Initialize and load saved draft
  useEffect(() => {
    const draftInfo = localStorage.getItem("doc_info_draft");
    const draftExps = localStorage.getItem("experiments_draft");
    
    if (draftInfo) {
      try { setDocInfo(JSON.parse(draftInfo)); } catch (e) {}
    }
    if (draftExps) {
      try { setExperiments(JSON.parse(draftExps)); } catch (e) {}
    }

    fetchSavedRecords();

    // Close dropdown click listener
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Extract Name and Register Number from currentUser
  useEffect(() => {
    if (currentUser) {
      const { name: extractedName, reg: extractedReg } = extractStudentMeta(currentUser);

      setDocInfo(prev => {
        let currentName = prev.student_name || "";
        let currentReg = prev.register_number || "";

        // If the name from draft contains the register number, clean it
        if (currentName && currentName.match(/\b\d{6,12}\b/)) {
          const cleaned = extractStudentMeta(currentName);
          currentName = cleaned.name;
          if (!currentReg) currentReg = cleaned.reg;
        }

        const isNameEmpty = !currentName || currentName === "Student Name" || currentName.trim() === "";
        const isRegEmpty = !currentReg || currentReg === "Your Register number" || currentReg.trim() === "";

        return {
          ...prev,
          student_name: isNameEmpty ? extractedName : currentName,
          register_number: isRegEmpty ? extractedReg : currentReg
        };
      });
    }
  }, [currentUser]);

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Autosave triggers
  useEffect(() => {
    localStorage.setItem("doc_info_draft", JSON.stringify(docInfo));
  }, [docInfo]);

  useEffect(() => {
    localStorage.setItem("experiments_draft", JSON.stringify(experiments));
  }, [experiments]);

  // Notification helper
  const triggerNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch saved records from database
  const fetchSavedRecords = async () => {
    setIsRecordsLoading(true);
    try {
      const response = await api.get("/api/documents");
      if (response.data && response.data.documents) {
        setSavedRecords(response.data.documents);
      }
    } catch (error) {
      console.error("Failed to load records from backend:", error);
    } finally {
      setIsRecordsLoading(false);
    }
  };

  // Handle document input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDocInfo(prev => ({ ...prev, [name]: value }));
  };

  // Experiment item handlers
  const handleExpChange = (index, field, value) => {
    setExperiments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addExperiment = () => {
    setExperiments(prev => [
      ...prev,
      { title: "", date: "", github_url: "" }
    ]);
  };

  const deleteExperiment = (index) => {
    if (experiments.length === 1) {
      triggerNotification("You must have at least one experiment entry.", "warning");
      return;
    }
    setExperiments(prev => prev.filter((_, i) => i !== index));
  };

  const duplicateExperiment = (index) => {
    setExperiments(prev => {
      const updated = [...prev];
      const clone = { ...updated[index] };
      updated.splice(index + 1, 0, clone);
      return updated;
    });
    triggerNotification("Experiment duplicated.");
  };

  const moveExperiment = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === experiments.length - 1) return;

    setExperiments(prev => {
      const updated = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      const temp = updated[index];
      updated[index] = updated[swapIndex];
      updated[swapIndex] = temp;
      return updated;
    });
  };

  // Save current form inputs and experiments list to local storage
  const handleSaveDraft = () => {
    localStorage.setItem("doc_info_draft", JSON.stringify(docInfo));
    localStorage.setItem("experiments_draft", JSON.stringify(experiments));
    triggerNotification("Experiments and document info saved successfully!");
  };

  // Reset all drafts
  const clearForm = () => {
    if (window.confirm("Are you sure you want to clear the form? This deletes local drafts.")) {
      localStorage.removeItem("doc_info_draft");
      localStorage.removeItem("experiments_draft");
      const { name: extractedName, reg: extractedReg } = extractStudentMeta(currentUser);
      setDocInfo({
        course_title_code: "",
        student_name: extractedName,
        register_number: extractedReg,
        department: "AIML",
        year: "II",
        semester: "IV",
        academic_year: "2025-2026"
      });
      setExperiments([{ title: "", date: "", github_url: "" }]);
      setPreviewBlobUrl(null);
      triggerNotification("Form cleared.");
    }
  };

  // Load a saved record back into editor
  const loadSavedRecord = (record) => {
    setDocInfo({
      course_title_code: `${record.course_code || ""}-${record.course_name || ""}`,
      student_name: record.student_name || "",
      register_number: record.register_number || "",
      department: record.department || "AIML",
      year: record.year || "II",
      semester: record.semester || "IV",
      academic_year: record.academic_year || "2025-2026"
    });
    setExperiments(record.experiments || []);
    setPreviewBlobUrl(null);
    setActiveTab("form");
    triggerNotification("Loaded record details.");
  };

  // Delete saved record
  const deleteSavedRecord = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this saved record?")) {
      try {
        await api.delete(`/api/documents/${id}`);
        setSavedRecords(prev => prev.filter(r => r.id !== id));
        triggerNotification("Record deleted successfully.");
      } catch (error) {
        triggerNotification("Failed to delete record.", "error");
      }
    }
  };

  // Generate payload
  const getPayload = () => {
    const titleAndCode = docInfo.course_title_code || "";
    const parts = titleAndCode.split("-");
    const code = parts[0]?.trim() || "CS23432";
    const name = parts.slice(1).join("-")?.trim() || "Software Construction";
    
    return {
      course_code: code,
      course_name: name,
      student_name: docInfo.student_name,
      register_number: docInfo.register_number,
      department: docInfo.department,
      year: docInfo.year,
      semester: docInfo.semester,
      academic_year: docInfo.academic_year,
      faculty: "",
      lab_name: "",
      institution: "",
      experiments: experiments.map(exp => {
        let dateVal = exp.date || "";
        if (dateVal.includes("-")) {
          const dParts = dateVal.split("-");
          // Convert from yyyy-mm-dd (browser) to dd-mm-yyyy (template)
          if (dParts[0].length === 4) {
            dateVal = `${dParts[2]}-${dParts[1]}-${dParts[0]}`;
          }
        }
        return {
          title: exp.title || "Untitled Experiment",
          date: dateVal,
          github_url: exp.github_url || ""
        };
      })
    };
  };

  // Validation checker for compulsory form fields
  const validateForm = () => {
    if (!docInfo.course_title_code?.trim()) return "Course Title and Code is required.";
    if (!docInfo.student_name?.trim()) return "Student Name is required.";
    if (!docInfo.register_number?.trim()) return "Register Number is required.";
    if (!docInfo.department?.trim()) return "Department / Branch is required.";
    if (!docInfo.year?.trim()) return "Year is required.";
    if (!docInfo.semester?.trim()) return "Semester is required.";
    if (!docInfo.academic_year?.trim()) return "Academic Year is required.";

    if (!experiments || experiments.length === 0) {
      return "At least one experiment entry is required.";
    }

    for (let i = 0; i < experiments.length; i++) {
      const exp = experiments[i];
      if (!exp.title?.trim()) {
        return `Experiment #${i + 1}: Title is required.`;
      }
      if (!exp.github_url?.trim()) {
        return `Experiment #${i + 1}: GitHub URL is required.`;
      }
    }
    return null;
  };

  // Generate and display PDF preview
  const handleShowPreview = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      triggerNotification(errorMsg, "warning");
      return;
    }
    setIsPreviewLoading(true);
    try {
      const payload = getPayload();
      const response = await api.post("/api/documents/preview", payload, {
        responseType: "blob"
      });
      
      // Revoke old URL to prevent memory leaks
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      
      const fileBlob = new Blob([response.data], { type: "application/pdf" });
      const fileUrl = URL.createObjectURL(fileBlob);
      setPreviewBlobUrl(fileUrl);
      triggerNotification("Preview refreshed.");
    } catch (error) {
      console.error("Preview failed:", error);
      triggerNotification("Failed to generate PDF preview.", "error");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Download DOCX file
  const handleDownloadDocx = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      triggerNotification(errorMsg, "warning");
      return;
    }
    setIsExportingDocx(true);
    try {
      const payload = getPayload();
      // Directly stream generated DOCX bytes
      const response = await api.post("/api/documents/generate?format=docx", payload, {
        responseType: "blob"
      });
      
      const fileBlob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(fileBlob);
      link.download = `Lab_Record_${payload.course_code || "Generated"}.docx`;
      link.click();
      
      // Sync document details in DB in background for user history list
      api.post("/api/documents/generate", payload)
        .then(() => fetchSavedRecords())
        .catch(e => console.warn("Failed background db sync", e));
        
      triggerNotification("DOCX download completed.");
    } catch (error) {
      console.error("DOCX download failed:", error);
      triggerNotification("Failed to generate DOCX.", "error");
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Download PDF file
  const handleDownloadPdf = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      triggerNotification(errorMsg, "warning");
      return;
    }
    setIsExportingPdf(true);
    try {
      const payload = getPayload();
      // Directly stream generated PDF bytes
      const response = await api.post("/api/documents/generate?format=pdf", payload, {
        responseType: "blob"
      });
      
      const fileBlob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(fileBlob);
      link.download = `Lab_Record_${payload.course_code || "Generated"}.pdf`;
      link.click();
      
      // Sync document details in DB in background for user history list
      api.post("/api/documents/generate", payload)
        .then(() => fetchSavedRecords())
        .catch(e => console.warn("Failed background db sync", e));
        
      triggerNotification("PDF download completed.");
    } catch (error) {
      console.error("PDF download failed:", error);
      triggerNotification("Failed to generate PDF.", "error");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      triggerNotification("Logout failed.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      
      {/* GLOBAL ALERTS & NOTIFICATIONS */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 16, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2.5 ${
              notification.type === "error"
                ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
                : notification.type === "warning"
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400"
                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {notification.type === "error" ? <Info size={16} /> : <CheckCircle size={16} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 glass border-b border-slate-200/50 dark:border-slate-800/40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary-500 text-white flex items-center justify-center shadow-sm">
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none text-slate-900 dark:text-white">
              Generate your Record
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Welcome, {currentUser?.displayName || "Student"}!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
            title="Toggle Theme"
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="h-9 w-9 rounded-full bg-primary-600 text-white font-extrabold text-sm flex items-center justify-center hover:ring-2 hover:ring-primary-500/30 transition uppercase cursor-pointer"
            >
              {currentUser?.displayName ? currentUser.displayName.trim()[0] : "S"}
            </button>

            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden py-1 z-50 text-sm"
                >
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {currentUser?.displayName || "Student User"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {currentUser?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowProfileDropdown(false); setActiveTab("records"); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 transition"
                  >
                    <FolderOpen size={16} /> Saved Records
                  </button>
                  <button
                    onClick={clearForm}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300 transition"
                  >
                    <RefreshCw size={16} /> Reset Form Draft
                  </button>
                  <div className="h-px bg-slate-100 dark:border-slate-800 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold transition"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* MOBILE NAVIGATION TABS */}
        <div className="lg:hidden col-span-1 flex rounded-xl bg-slate-200/60 dark:bg-slate-900 p-1 mb-2">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "form"
                ? "bg-white dark:bg-slate-800 text-primary-500 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Generator Form
          </button>
          <button
            onClick={() => setActiveTab("records")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "records"
                ? "bg-white dark:bg-slate-800 text-primary-500 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Saved Records ({savedRecords.length})
          </button>
        </div>

        {/* LEFT COLUMN: EDITOR FORM */}
        <div className={`col-span-1 lg:col-span-7 flex flex-col gap-6 overflow-y-auto ${
          activeTab !== "form" ? "hidden lg:flex" : "flex"
        }`}>
          
          {/* BLUE ANNOUNCEMENT BANNER */}
          <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-5 flex items-start gap-4">
            <div className="mt-0.5 p-2 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Info size={18} />
            </div>
            <div className="text-sm">
              <h4 className="font-extrabold text-blue-900 dark:text-blue-300 leading-tight">
                Thank You for Using Our Website!
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-blue-800/80 dark:text-blue-400 leading-relaxed font-medium">
                <li>
                  <span className="font-bold text-blue-900 dark:text-blue-300">Navigate Your Documents:</span> Click on your profile menu to access and manage your saved documents and records.
                </li>
                <li>
                  <span className="font-bold text-blue-900 dark:text-blue-300">Download Options:</span> Generate and download your lab records directly as PDF or DOCX format for easy sharing and printing.
                </li>
              </ul>
            </div>
          </div>

          {/* SECTION 1: DOCUMENT INFORMATION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="text-primary-500" size={19} />
              <h3 className="font-extrabold text-base tracking-tight">Document Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Course Title and Code <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="course_title_code"
                  value={docInfo.course_title_code}
                  onChange={handleInputChange}
                  placeholder="CS23432-Software Construction"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Student Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="student_name"
                  value={docInfo.student_name}
                  onChange={handleInputChange}
                  placeholder="Student Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Register Number <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="register_number"
                  value={docInfo.register_number}
                  onChange={handleInputChange}
                  placeholder="Your Register number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Department / Branch <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="department"
                  value={docInfo.department}
                  onChange={handleInputChange}
                  placeholder="e.g. AIML"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Year <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="year"
                  value={docInfo.year}
                  onChange={handleInputChange}
                  placeholder="e.g. II"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Semester <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="semester"
                  value={docInfo.semester}
                  onChange={handleInputChange}
                  placeholder="e.g. IV"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Academic Year <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  name="academic_year"
                  value={docInfo.academic_year}
                  onChange={handleInputChange}
                  placeholder="e.g. 2025-2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: EXPERIMENT TABLES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-primary-500" size={19} />
                <h3 className="font-extrabold text-base tracking-tight">Experiments</h3>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                >
                  <Save size={14} /> Save
                </button>
                <button
                  type="button"
                  onClick={addExperiment}
                  className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
                >
                  <Plus size={14} /> Add Experiment
                </button>
              </div>
            </div>

            {/* DYNAMIC CARD SCROLLER */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {experiments.map((exp, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 flex flex-col gap-3 relative overflow-hidden group"
                  >
                    {/* Header index and reordering */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500">
                        Exp #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveExperiment(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-400 hover:text-primary-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExperiment(idx, "down")}
                          disabled={idx === experiments.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-primary-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 disabled:opacity-30 transition"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteExperiment(idx)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
                        >
                          <Trash2 size={13.5} />
                        </button>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-6">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                          Experiment Title <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={exp.title}
                            onChange={(e) => handleExpChange(idx, "title", e.target.value)}
                            placeholder="e.g. Data Preprocessing using Pandas"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                          />
                        </div>
                      </div>
                      
                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                          Date
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-600">
                            <Calendar size={13} />
                          </span>
                          <input
                            type="date"
                            value={getFormattedDateForInput(exp.date)}
                            onChange={(e) => handleExpChange(idx, "date", e.target.value)}
                            className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-semibold transition"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                          GitHub URL <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-600">
                            <LinkIcon size={13} />
                          </span>
                          <input
                            type="text"
                            value={exp.github_url}
                            onChange={(e) => handleExpChange(idx, "github_url", e.target.value)}
                            placeholder="https://github..."
                            className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 text-sm font-medium transition"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {/* Dashed placeholder for Adding */}
            <button
              type="button"
              onClick={addExperiment}
              className="mt-4 p-4 border border-dashed border-slate-300 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-sm transition"
            >
              <Plus size={16} /> Add Experiment Entry
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW PANE & SAVED RECORDS */}
        <div className={`col-span-1 lg:col-span-5 flex flex-col gap-6 overflow-y-auto ${
          activeTab !== "records" ? "hidden lg:flex" : "flex"
        }`}>
          
          {/* ACTIONS AND EXPORTS SECTION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Actions
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleShowPreview}
                disabled={isPreviewLoading}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50"
              >
                {isPreviewLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Eye size={15} />
                )}
                Show Preview
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/10 active:scale-95 transition disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                Download PDF
              </button>

              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={isExportingDocx}
                className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10 active:scale-95 transition disabled:opacity-50"
              >
                {isExportingDocx ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
                Download DOCX
              </button>
            </div>
          </div>

          {/* PDF PREVIEW FRAME CONTAINER */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                Document Preview
              </span>
              {previewBlobUrl && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-extrabold">
                  READY
                </span>
              )}
            </div>
            
            <div className={`flex-1 w-full rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative ${
              !previewBlobUrl || isPreviewLoading ? "flex items-center justify-center" : ""
            }`}>
              {isPreviewLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-primary-500" size={30} />
                  <span className="text-xs font-semibold text-slate-500">Compiling document PDF...</span>
                </div>
              ) : previewBlobUrl ? (
                <PdfViewer url={previewBlobUrl} />
              ) : (
                <div className="flex flex-col items-center p-6 text-center gap-2 text-slate-400 dark:text-slate-600">
                  <Eye size={40} className="stroke-[1.5]" />
                  <p className="text-xs font-bold">No active preview compiled.</p>
                  <p className="text-[10px] font-medium max-w-[200px]">
                    Click "Show Preview" to generate a temporary PDF layout in-memory.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SAVED RECORDS ARCHIVE PANEL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                Saved Records
              </span>
              <button
                type="button"
                onClick={fetchSavedRecords}
                disabled={isRecordsLoading}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition"
                title="Sync Saved Documents"
              >
                <RefreshCw size={14} className={isRecordsLoading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {isRecordsLoading && savedRecords.length === 0 ? (
                <div className="py-6 flex justify-center">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : savedRecords.length > 0 ? (
                savedRecords.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => loadSavedRecord(rec)}
                    className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-primary-500 dark:hover:border-primary-500 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer flex items-center justify-between gap-3 group transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 group-hover:text-primary-500 shrink-0 shadow-sm transition">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate leading-none">
                          {rec.course_code || "GENERIC"} - {rec.course_name || "Lab Notebook"}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
                          {rec.experiments?.length || 0} Exp(s) • {new Date(rec.updated_at || rec.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      {rec.pdf_url && !rec.pdf_url.startsWith("mock_url") && (
                        <a
                          href={rec.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition"
                          title="Open PDF"
                        >
                          <Download size={13} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={(e) => deleteSavedRecord(rec.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition"
                        title="Delete record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs font-semibold text-slate-400 dark:text-slate-600">
                  No saved documents found in database.
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* FOOTER METADATA */}
      <footer className="text-center py-4 border-t border-slate-200/50 dark:border-slate-800/40 text-[10px] font-bold text-slate-400 tracking-wider">
        LAB RECORD NOTEBOOK GENERATOR • SYSTEM ACTIVE
      </footer>
    </div>
  );
};

export default Dashboard;
