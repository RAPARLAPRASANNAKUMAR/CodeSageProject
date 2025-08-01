import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from 'firebase/auth';
// Firestore Imports
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';


// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDdpYpOsFQA3bA-4vbLFbYAIBOjhBEXkm0",
    authDomain: "codesage-5b38f.firebaseapp.com",
    projectId: "codesage-5b38f",
    storageBucket: "codesage-5b38f.appspot.com",
    messagingSenderId: "782715883034",
    appId: "1:782715883034:web:f40ac7120f181608bd4ba3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Professional CSS Styles ---
const styles = `
/* ... existing styles ... */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.modal-content {
    background-color: var(--bg-secondary);
    padding: 2rem;
    border-radius: 0.75rem;
    border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px -10px var(--shadow-color);
    width: 90%;
    max-width: 500px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
    margin: 0;
    color: var(--text-primary);
}

.modal-close-button {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    line-height: 1;
}

.workspace-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 300px;
    overflow-y: auto;
}

.workspace-item {
    padding: 0.75rem 1rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.workspace-item:hover {
    background-color: var(--bg-tertiary);
}

.output-tabs {
    display: flex;
    background-color: var(--bg-primary);
    padding: 0 0.5rem;
    border-bottom: 1px solid var(--border-color);
    gap: 0.5rem;
}

.tab-button {
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    color: var(--text-secondary);
    cursor: pointer;
    font-weight: 500;
    border-bottom: 3px solid transparent;
    transition: all 0.2s ease;
    margin-bottom: -1px;
}

.tab-button.active {
    color: var(--accent-primary);
    border-bottom: 3px solid var(--accent-primary);
}

.tab-button:hover:not(.active) {
    color: var(--text-primary);
    background-color: var(--bg-tertiary);
}

.analysis-content, .flow-content {
    padding: 1rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-y: auto;
    flex-grow: 1;
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-family: var(--font-sans);
}

.analysis-content h4, .flow-content h4 {
    color: var(--text-primary);
    font-weight: 700;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.25rem;
}

.analysis-content code, .flow-content code {
    background-color: var(--bg-secondary);
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    font-family: var(--font-mono);
}

/* Import Google Font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  --font-mono: 'Menlo', 'Monaco', 'Courier New', monospace;
  --shadow-color: rgba(0, 0, 0, 0.2);
  --shadow-color-light: rgba(100, 100, 100, 0.15);
}

/* Light Theme Variables */
.theme-light {
  --bg-primary: #fdf6e3;
  --bg-secondary: #f5efdc;
  --bg-tertiary: #eee8d5;
  --border-color: #d3cbb7;
  --text-primary: #586e75;
  --text-secondary: #657b83;
  --accent-primary: #268bd2;
  --accent-secondary: #d33682;
  --accent-hover: #1a6293;
}

/* Dark Theme Variables (Tokyo Night) */
.theme-dark {
  --bg-primary: #1a1b26;
  --bg-secondary: #24283b;
  --bg-tertiary: #414868;
  --border-color: #3b3f51;
  --text-primary: #c0caf5;
  --text-secondary: #a9b1d6;
  --accent-primary: #7aa2f7;
  --accent-secondary: #bb9af7;
  --accent-hover: #9ecef7;
}

.codesage-container {
  background-color: var(--bg-primary);
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  color: var(--text-primary);
  font-family: var(--font-sans);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  box-sizing: border-box;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.codesage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.codesage-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.codesage-logo h1 {
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(to right, var(--accent-secondary), var(--accent-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.codesage-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.codesage-main {
  flex-grow: 1;
  display: flex;
  gap: 0;
  min-height: 0;
}

.panel {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px var(--shadow-color);
  transition: all 0.3s ease;
}

.panel:focus-within {
    box-shadow: 0 0 0 2px var(--accent-primary), 0 10px 25px -5px var(--shadow-color);
}

.editor-panel {
  flex-shrink: 0;
}

.output-panel {
  flex-grow: 1;
}

.output-header {
  background-color: var(--bg-secondary);
  padding: 0;
  border-bottom: 1px solid var(--border-color);
  user-select: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.output-controls {
    padding-right: 0.5rem;
}

.output-controls button {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s ease;
}
.output-controls button:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
}

.output-content {
  padding: 1rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-y: auto;
  flex-grow: 1;
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.resizer {
  flex-shrink: 0;
  width: 10px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resizer:hover::before, .resizer.is-dragging::before {
  content: '';
  width: 3px;
  height: 40px;
  background-color: var(--accent-primary);
  border-radius: 3px;
}

@media (max-width: 768px) {
  .codesage-main { flex-direction: column; }
  .resizer { display: none; }
  .editor-panel, .output-panel { width: 100% !important; height: 50vh; }
}

.styled-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.6rem 1.5rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(to right, var(--accent-secondary), var(--accent-primary));
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px -2px rgba(187, 154, 247, 0.3);
  transform: translateY(0);
}
.styled-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px -2px rgba(122, 162, 247, 0.4); }
.styled-button:active { transform: translateY(0); }
.styled-button:disabled { background: var(--bg-tertiary); color: #6c757d; cursor: not-allowed; box-shadow: none; transform: translateY(0); }

.language-selector { position: relative; display: inline-block; }
.language-button { display: inline-flex; justify-content: center; align-items: center; width: 100%; border-radius: 0.375rem; border: 1px solid var(--border-color); padding: 0.6rem 1rem; background-color: var(--bg-secondary); font-size: 0.875rem; font-weight: 500; color: var(--text-primary); cursor: pointer; transition: all 0.2s ease-in-out; }
.language-button:hover { background-color: var(--bg-tertiary); border-color: var(--accent-primary); }
.language-dropdown { position: absolute; right: 0; margin-top: 0.5rem; width: 10rem; border-radius: 0.375rem; background-color: var(--bg-secondary); box-shadow: 0 10px 25px -5px var(--shadow-color); z-index: 10; border: 1px solid var(--border-color); overflow: hidden; padding: 0.25rem; }
.language-dropdown-item { display: block; width: 100%; text-align: left; padding: 0.5rem 1rem; font-size: 0.875rem; color: var(--text-secondary); background: none; border: none; cursor: pointer; border-radius: 0.25rem; transition: all 0.2s ease; }
.language-dropdown-item:hover { background-color: var(--accent-primary); color: white; }
.language-dropdown-item.selected { background-color: var(--accent-secondary); color: white; font-weight: 600; }

.icon { width: 1.25rem; height: 1.25rem; }
.logo-icon { width: 2.25rem; height: 2.25rem; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.spinner { animation: spin 1s linear infinite; }

.theme-toggle { background: none; border: 1px solid var(--border-color); color: var(--text-secondary); cursor: pointer; padding: 0.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
.theme-toggle:hover { color: var(--accent-primary); border-color: var(--accent-primary); transform: rotate(15deg); }

/* Authentication Styles */
.login-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-color: var(--bg-primary);
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  color: var(--text-primary);
  font-family: var(--font-sans);
}
.login-modal {
  background-color: var(--bg-secondary);
  padding: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  box-shadow: 0 20px 40px -10px var(--shadow-color);
  text-align: center;
  max-width: 400px;
  width: 90%;
}
.login-modal .codesage-logo {
  justify-content: center;
  margin-bottom: 1.5rem;
}
.login-modal p {
    margin: 0 0 1.5rem 0;
    color: var(--text-secondary);
}
.login-modal .divider {
    margin: 1.5rem 0;
    border-top: 1px solid var(--border-color);
    text-align: center;
    position: relative;
}
.login-modal .divider span {
    position: relative;
    top: -0.75em;
    background: var(--bg-secondary);
    padding: 0 1rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
}
.login-modal input {
  width: 100%;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
  box-sizing: border-box;
}
.login-modal input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-primary);
}
.user-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary);
}
.user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
}
.logout-button {
  background: none;
  border: 1px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}
.logout-button:hover {
  color: var(--accent-secondary);
  border-color: var(--accent-secondary);
}
.error-message {
    color: #e57373; /* A soft red for errors */
    margin-top: 1rem;
    font-size: 0.875rem;
}
`;

// --- Icon Components ---
const CodeSageLogo = () => (<svg className="logo-icon" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style={{stopColor:'var(--accent-secondary)', stopOpacity:1}} /><stop offset="100%" style={{stopColor:'var(--accent-primary)', stopOpacity:1}} /></linearGradient></defs><path fill="url(#grad1)" d="M42.6,128,0,106.7V21.3L42.6,0,85.3,21.3V64l-10.7-5.9V27.2L42.6,10.7,10.7,27.2V100.8l31.9,15.9,32-15.9V74.7l10.7,5.9V106.7Z"/><path fill="url(#grad1)" d="M117.3,100.8,85.4,84.9v-16l10.7-5.9,31.9,15.9v27.9l-10.7,5.9V100.8Z"/><path fill="url(#grad1)" d="M96,74.7,64,58.8,74.7,53,128,80v16L96,111.9Z"/></svg>);
const PlayIcon = () => (<svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>);
const AnalyzeIcon = () => (<svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M4 20h2"/><path d="M4 14h14"/><path d="M12 8h7"/><path d="M4 8h2"/><path d="M4 4h16"/></svg>);
const FlowIcon = () => (<svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m0-3h6a2 2 0 0 1 2 2v3"/><path d="M10 14h4"/><path d="M8 10h8"/></svg>);
const WorkspaceIcon = () => (<svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>);
const ChevronDownIcon = () => (<svg className="icon" style={{ marginLeft: '0.5rem' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>);
const LoaderIcon = () => (<svg className="icon spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>);
const SunIcon = () => (<svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>);
const MoonIcon = () => (<svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>);
const CopyIcon = () => (<svg className="icon" style={{width: '1rem', height: '1rem'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>);
const ClearIcon = () => (<svg className="icon" style={{width: '1rem', height: '1rem'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);
const LogoutIcon = () => (<svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>);
const GoogleIcon = () => (<svg className="icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>);


// --- Language Selector Component ---
const LanguageSelector = ({ language, setLanguage, languages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedLanguage = languages.find(l => l.value === language);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button type="button" className="language-button" onClick={() => setIsOpen(!isOpen)}>
        {selectedLanguage.label} <ChevronDownIcon />
      </button>
      {isOpen && (
        <div className="language-dropdown">
          {languages.map((lang) => (
            <button key={lang.value} className={`language-dropdown-item ${lang.value === language ? 'selected' : ''}`} onClick={() => { setLanguage(lang.value); setIsOpen(false); }}>
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Login Screen Component ---
const LoginScreen = () => {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const signInWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch((err) => setError(err.message));
    };

    const handlePhoneLogin = async (e) => {
        e.preventDefault();
        setError("");
        if (phone.length < 10) {
            setError("Please enter a valid phone number.");
            return;
        }
        setLoading(true);
        try {
            const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
            const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
            setConfirmationResult(result);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError("");
        if (otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP.");
            return;
        }
        setLoading(true);
        try {
            await confirmationResult.confirm(otp);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="login-overlay">
            <div className="login-modal">
                <div className="codesage-logo">
                    <CodeSageLogo />
                    <h1>CodeSage</h1>
                </div>
                <p>The AI-powered code editor that thinks with you.</p>
                <button onClick={signInWithGoogle} className="styled-button" style={{width: '100%'}}>
                    <GoogleIcon /> Sign In with Google
                </button>
                <div className="divider"><span>OR</span></div>
                
                {!confirmationResult ? (
                    <form onSubmit={handlePhoneLogin}>
                        <input type="tel" placeholder="+1 555 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        <button type="submit" className="styled-button" style={{width: '100%'}} disabled={loading}>
                            {loading ? <LoaderIcon/> : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <input type="number" placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                        <button type="submit" className="styled-button" style={{width: '100%'}} disabled={loading}>
                            {loading ? <LoaderIcon/> : 'Verify OTP'}
                        </button>
                    </form>
                )}
                {error && <p className="error-message">{error}</p>}
                <div id="recaptcha-container" style={{marginTop: '1rem'}}></div>
            </div>
        </div>
    );
};

// --- Main Application Component ---
function CodeSageEditor() {
    // --- Existing State ---
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [code, setCode] = useState("// Welcome to CodeSage!");
    const [language, setLanguage] = useState("python");
    const [output, setOutput] = useState("Your code output will appear here.");
    const [isLoading, setIsLoading] = useState(false);
    const [editorWidth, setEditorWidth] = useState(60);
    const [theme, setTheme] = useState('dark');
    const isResizing = useRef(false);
    const ws = useRef(null);

    // --- State for Analysis & Workspace Features ---
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState("");
    const [isVisualizing, setIsVisualizing] = useState(false);
    const [flow, setFlow] = useState("");
    const [activeTab, setActiveTab] = useState("output");
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState('default');


    const languages = [
        { value: 'python', label: 'Python' },
        { value: 'java', label: 'Java' },
        { value: 'javascript', label: 'JavaScript' },
        { value: 'typescript', label: 'TypeScript' },
        { value: 'go', label: 'Go' },
        { value: 'rust', label: 'Rust' },
        { value: 'c', label: 'C' },
        { value: 'cpp', label: 'C++' },
    ];
    
    // --- UPDATED: Authentication and Workspace Loading Logic ---
    useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                // If user logs out, reset to default state
                setCode("// Welcome to CodeSage!");
                setLanguage("python");
                setActiveWorkspaceId('default');
            }
            setAuthReady(true);
        });
        return () => authUnsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const workspacesColRef = collection(db, "users", user.uid, "workspaces");
            const unsubscribe = onSnapshot(workspacesColRef, (snapshot) => {
                const userWorkspaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setWorkspaces(userWorkspaces);
                // Ensure a default workspace exists
                if (!snapshot.docs.some(doc => doc.id === 'default')) {
                    const docRef = doc(db, "users", user.uid, "workspaces", "default");
                    setDoc(docRef, { name: "Default Snippet", code: "// Welcome to CodeSage!", language: "python" });
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    // --- NEW: Save workspace automatically on change ---
    useEffect(() => {
        if (user && authReady && code !== "// Welcome to CodeSage!") { // Don't save the initial default code
            const saveTimeout = setTimeout(async () => {
                const docRef = doc(db, "users", user.uid, "workspaces", activeWorkspaceId);
                
                const namePrompt = `Create a very short, descriptive name (3-5 words max) for the following ${language} code snippet. The name should summarize the code's purpose. For example, 'Python Duplicate Finder' or 'Java Palindrome Check'. Do not include quotes in your response.\n\nCode:\n${code}`;
                
                let snippetName = "Untitled Snippet";
                try {
                    const apiKey = ""; // Will be provided by the environment
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                    const requestBody = { contents: [{ parts: [{ text: namePrompt }] }] };
                    
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        snippetName = result.candidates[0].content.parts[0].text.trim();
                    }
                } catch (error) {
                    console.error("Error generating snippet name:", error);
                }

                await setDoc(docRef, { name: snippetName, code, language }, { merge: true });

            }, 2000); 

            return () => clearTimeout(saveTimeout);
        }
    }, [code, language, user, authReady, activeWorkspaceId]);

    // Effect to handle tab visibility change
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && ws.current) {
                console.log("Tab hidden, closing WebSocket connection.");
                ws.current.close();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);


    const handleMouseDown = (e) => { isResizing.current = true; e.currentTarget.classList.add('is-dragging'); };
    const handleMouseUp = () => { isResizing.current = false; const resizer = document.querySelector('.resizer'); if(resizer) resizer.classList.remove('is-dragging'); };
    const handleMouseMove = (e) => {
        if (!isResizing.current) return;
        const totalWidth = e.currentTarget.offsetWidth;
        const newEditorWidth = (e.clientX - e.currentTarget.getBoundingClientRect().left) / totalWidth * 100;
        if (newEditorWidth > 20 && newEditorWidth < 80) setEditorWidth(newEditorWidth);
    };

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);
    
    const connectWebSocket = (onOpenCallback) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.close();
        }
        
        ws.current = new WebSocket("ws://localhost:8080/code-socket");

        ws.current.onopen = onOpenCallback;
        
        ws.current.onmessage = (event) => {
            console.log("Received message from backend:", event.data);
            const message = JSON.parse(event.data);
            
            if (message.type === 'output') {
                setOutput(prev => prev + message.data);
            } else if (message.type === 'analysis') {
                setAnalysis(prev => prev + message.data);
            } else if (message.type === 'flow') {
                setFlow(prev => prev + message.data);
            } else if (message.type === 'error') {
                if (activeTab === 'analysis') setAnalysis(prev => prev + message.data);
                else if (activeTab === 'flow') setFlow(prev => prev + message.data);
                else setOutput(prev => prev + message.data);
            } else if (message.type === 'finished') {
                setIsLoading(false);
            } else if (message.type === 'analysis_finished') {
                setIsAnalyzing(false);
            } else if (message.type === 'flow_finished') {
                setIsVisualizing(false);
            }
        };
        
        ws.current.onclose = (event) => {
            console.log("WebSocket connection closed.", event);
            setIsLoading(false);
            setIsAnalyzing(false);
            setIsVisualizing(false);
        };

        ws.current.onerror = (error) => {
            console.error("WebSocket Error:", error);
            setOutput(prev => prev + "\nError: Could not connect to the execution service.");
            setIsLoading(false);
            setIsAnalyzing(false);
            setIsVisualizing(false);
        };
    }

    const runCode = () => {
        if (!code || isLoading) return;
        setIsLoading(true);
        setOutput("");
        setActiveTab("output");
        connectWebSocket(() => {
            ws.current.send(JSON.stringify({ type: 'run', code, language }));
        });
    };
    
    const analyzeCode = () => {
        if (!code || isAnalyzing) return;
        setIsAnalyzing(true);
        setAnalysis("");
        setActiveTab("analysis");
        connectWebSocket(() => {
            ws.current.send(JSON.stringify({ type: 'analyze', code, language }));
        });
    };
    
    const visualizeCode = () => {
        if (!code || isVisualizing) return;
        setIsVisualizing(true);
        setFlow("");
        setActiveTab("flow");
        connectWebSocket(() => {
            ws.current.send(JSON.stringify({ type: 'visualize', code, language }));
        });
    };
    
    const copyToClipboard = () => {
        let textToCopy = "";
        if (activeTab === 'output') textToCopy = output;
        else if (activeTab === 'analysis') textToCopy = analysis;
        else if (activeTab === 'flow') textToCopy = flow;
        navigator.clipboard.writeText(textToCopy);
    };
    
    const handleSignOut = () => {
        signOut(auth).catch((error) => console.error("Sign out error:", error));
    };

    if (!authReady) {
        return (
            <>
                <style>{styles}</style>
                <div className={`theme-${theme} login-overlay`}><LoaderIcon/></div>
            </>
        );
    }

    if (!user) {
        return (
            <>
                <style>{styles}</style>
                <div className={`theme-${theme}`}><LoginScreen /></div>
            </>
        );
    }

    return (
        <>
            <style>{styles}</style>
            <div className={`codesage-container theme-${theme}`}>
                <header className="codesage-header">
                    <div className="codesage-logo"><CodeSageLogo /><h1>CodeSage</h1></div>
                    <div className="codesage-controls">
                        <div className="user-display">
                            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.phoneNumber}&background=random`} alt={user.displayName || 'User Avatar'} className="user-avatar" referrerPolicy="no-referrer" />
                            <span>{user.displayName || user.phoneNumber}</span>
                            <button className="logout-button" onClick={handleSignOut} title="Sign Out"><LogoutIcon /></button>
                        </div>
                        
                        <button onClick={() => setIsWorkspaceOpen(true)} className="styled-button">
                            <WorkspaceIcon />
                            <span>Workspace</span>
                        </button>

                        <LanguageSelector language={language} setLanguage={setLanguage} languages={languages} />
                        
                        <button onClick={visualizeCode} disabled={isVisualizing} className="styled-button">
                            {isVisualizing ? <LoaderIcon /> : <FlowIcon />}
                            <span>{isVisualizing ? 'Visualizing...' : 'Visualize'}</span>
                        </button>

                        <button onClick={analyzeCode} disabled={isAnalyzing} className="styled-button">
                            {isAnalyzing ? <LoaderIcon /> : <AnalyzeIcon />}
                            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
                        </button>

                        <button onClick={runCode} disabled={isLoading} className="styled-button">
                            {isLoading ? <LoaderIcon /> : <PlayIcon />}
                            <span>{isLoading ? 'Running...' : 'Run'}</span>
                        </button>
                        <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                        </button>
                    </div>
                </header>

                <main className="codesage-main" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                    <div className="panel editor-panel" style={{ width: `${editorWidth}%` }}>
                        <Editor height="100%" language={language} theme={theme === 'dark' ? "vs-dark" : "vs"} value={code} onChange={(v) => setCode(v || "")} options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }} />
                    </div>

                    <div className="resizer" onMouseDown={handleMouseDown}></div>

                    <div className="panel output-panel">
                        <div className="output-header">
                            <div className="output-tabs">
                                <button className={`tab-button ${activeTab === 'output' ? 'active' : ''}`} onClick={() => setActiveTab('output')}>Output</button>
                                <button className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>Analysis</button>
                                <button className={`tab-button ${activeTab === 'flow' ? 'active' : ''}`} onClick={() => setActiveTab('flow')}>Flow</button>
                            </div>
                            <div className="output-controls">
                                <button onClick={copyToClipboard} title="Copy to clipboard"><CopyIcon/></button>
                                <button onClick={() => { 
                                    if (activeTab === 'output') setOutput("");
                                    else if (activeTab === 'analysis') setAnalysis("");
                                    else if (activeTab === 'flow') setFlow("");
                                }} title="Clear"><ClearIcon/></button>
                            </div>
                        </div>
                        
                        {activeTab === 'output' && <pre className="output-content">{output}</pre>}
                        {activeTab === 'analysis' && (
                            <div className="analysis-content">
                                {isAnalyzing ? <LoaderIcon/> : <div dangerouslySetInnerHTML={{ __html: analysis }} />}
                            </div>
                        )}
                        {activeTab === 'flow' && (
                            <div className="flow-content">
                                {isVisualizing ? <LoaderIcon/> : <div dangerouslySetInnerHTML={{ __html: flow }} />}
                            </div>
                        )}
                    </div>
                </main>

                {isWorkspaceOpen && (
                    <div className="modal-overlay" onClick={() => setIsWorkspaceOpen(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>My Workspace</h2>
                                <button className="modal-close-button" onClick={() => setIsWorkspaceOpen(false)}>&times;</button>
                            </div>
                            <ul className="workspace-list">
                                {workspaces.length > 0 ? workspaces.map(ws => (
                                    <li 
                                        key={ws.id} 
                                        className="workspace-item"
                                        onClick={() => {
                                            setCode(ws.code);
                                            setLanguage(ws.language);
                                            setActiveWorkspaceId(ws.id);
                                            setIsWorkspaceOpen(false);
                                        }}
                                    >
                                        <span>{ws.name || "Untitled Snippet"}</span>
                                        <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{ws.language}</span>
                                    </li>
                                )) : (
                                    <li>No saved workspaces found.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default CodeSageEditor;