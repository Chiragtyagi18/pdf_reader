"use client";

import { useState, useRef, useEffect } from "react";

const API_URL = "http://localhost:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isPdfUploaded, setIsPdfUploaded] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check backend connection on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/`);
        if (response.ok) {
          setBackendStatus("online");
          console.log("Backend is online");
        } else {
          setBackendStatus("offline");
        }
      } catch (error) {
        console.error("Backend connection failed:", error);
        setBackendStatus("offline");
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setUploadStatus("");
      } else {
        setUploadStatus("Please select a PDF file");
        setFile(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
      setUploadStatus("");
    } else {
      setUploadStatus("Please drop a PDF file");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus("Please select a file first");
      return;
    }

    if (backendStatus === "offline") {
      setUploadStatus("❌ Backend server is offline. Please start the backend on port 8000.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setUploadStatus("Uploading...");
      console.log("Uploading file:", file.name);
      
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      console.log("Upload response status:", response.status);
      const data = await response.json();
      console.log("Upload response data:", data);
      
      if (response.ok) {
        setUploadStatus(`✅ PDF uploaded successfully! Processed ${data.chunks || 0} chunks.`);
        setMessages([]);
        setIsPdfUploaded(true);
      } else {
        setUploadStatus(`❌ Upload failed: ${data.detail || "Please try again."}`);
        setIsPdfUploaded(false);
        console.error("Upload failed:", data);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus(`❌ Error: ${error instanceof Error ? error.message : "Error connecting to server"}`);
      setIsPdfUploaded(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !isPdfUploaded) return;

    const userMessage: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: userMessage.content }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.answer || "No answer received",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          role: "assistant",
          content: data.detail || "Error getting answer from server",
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Question error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "Error connecting to server. Please make sure the backend is running.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 bg-white/80 dark:bg-slate-800/80 glass border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold gradient-text">
              PDF Reader
            </h1>
          </div>
          <div className={`px-3 py-1.5 text-xs font-semibold rounded-full flex items-center gap-2 ${
            backendStatus === "online" 
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-1 ring-emerald-500/20"
              : backendStatus === "offline"
              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 ring-1 ring-red-500/20"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 ring-1 ring-amber-500/20"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              backendStatus === "online" ? "bg-emerald-500 animate-pulse" 
              : backendStatus === "offline" ? "bg-red-500" 
              : "bg-amber-500 animate-pulse"
            }`}></span>
            {backendStatus === "online" ? "Connected" : backendStatus === "offline" ? "Offline" : "Connecting..."}
          </div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Upload Box */}
        <div className="w-1/2 p-8 border-r border-slate-200/50 dark:border-slate-700/50 overflow-auto bg-white/30 dark:bg-slate-800/30">
          <div className="max-w-lg mx-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                Upload Document
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Upload a PDF to start asking questions
              </p>
            </div>

            <div 
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
                isDragOver 
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]" 
                  : file 
                  ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20" 
                  : "border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />

              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 ${
                  file 
                    ? "bg-emerald-100 dark:bg-emerald-900/50" 
                    : "bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50"
                }`}>
                  {file ? (
                    <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-medium mb-2">
                  {file ? "File selected" : "Drop your PDF here"}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-500">
                  or <span className="text-indigo-600 dark:text-indigo-400 hover:underline">browse</span> to upload
                </span>
              </label>
            </div>

            {file && (
              <div className="mt-5 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink:0">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9.5 13h1v4h-1v-1.5H8V17H7v-4h1v1.5h1.5V13zm4.5 0h-3v4h3v-1h-2v-.5h1.5v-1H12v-.5h2v-1z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => { setFile(null); setUploadStatus(""); setIsPdfUploaded(false); }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`w-full mt-5 px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                !file || loading
                  ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-400 dark:text-indigo-500 border-2 border-dashed border-indigo-300 dark:border-indigo-700 cursor-not-allowed"
                  : "bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload PDF
                </>
              )}
            </button>

            {uploadStatus && (
              <div className={`mt-5 p-4 rounded-xl flex items-center gap-3 ${
                uploadStatus.includes("✅")
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
                  : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-1 ring-red-500/20"
              }`}>
                {uploadStatus.includes("✅") ? (
                  <svg className="w-5 h-5 flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="text-sm font-medium">{uploadStatus.replace("✅ ", "").replace("❌ ", "")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat Bot */}
        <div className="w-1/2 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 glass">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    AI Assistant
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ask anything about your document
                  </p>
                </div>
              </div>
              {isPdfUploaded && (
                <span className="px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full ring-1 ring-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Ready
                </span>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {!isPdfUploaded ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-linear-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                    <svg className="w-12 h-12 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    No document yet
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Upload a PDF from the left panel to start chatting with your document
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
                    <svg className="w-12 h-12 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Ready to help!
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-500">
                    Ask me anything about your uploaded PDF document
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-xl flex-shrink:0 flex items-center justify-center ${
                        msg.role === "user" 
                          ? "bg-linear-to-br from-indigo-500 to-purple-600" 
                          : "bg-linear-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600"
                      }`}>
                        {msg.role === "user" ? (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-br-md"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
            {loading && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-8 h-8 rounded-xl bg-linear-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-2xl rounded-bl-md shadow-sm ring-1 ring-slate-200/50 dark:ring-slate-700/50">
                    <div className="flex space-x-1.5">
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-5 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 glass">
            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAskQuestion()}
                placeholder={isPdfUploaded ? "Type your question..." : "Upload a PDF to start..."}
                disabled={!isPdfUploaded || loading}
                className="flex-1 px-5 py-3.5 bg-slate-100 dark:bg-slate-900 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
              <button
                onClick={handleAskQuestion}
                disabled={!question.trim() || !isPdfUploaded || loading}
                className={`px-5 py-3.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center ${
                  !question.trim() || !isPdfUploaded || loading
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    : "bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
