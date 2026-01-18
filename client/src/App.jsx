import React, { useState, useEffect } from 'react';
import { UploadSection } from './components/UploadSection';
import { ResultsTable } from './components/ResultsTable';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MagicLinkLogin } from './components/MagicLinkLogin';
import { CloudHistoryModal } from './components/CloudHistoryModal';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { encryptionService } from './services/encryptionService';

function AppContent() {
  const [results, setResults] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { currentUser, userProfile, logout, finishLoginWithLink } = useAuth();

  // Check for Magic Link redirect on mount
  useEffect(() => {
    finishLoginWithLink().then(user => {
      if (user) {
        console.log("Magic Link Login Successful");
        // Remove the query params from URL to clean up
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });
  }, []);

  const handleGrade = async (files) => {
    setIsGrading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append('exam', files.exam);
    formData.append('rubricText', files.rubricText);
    files.submissions.forEach(file => {
      formData.append('submissions', file);
    });

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results);
      setExcelFile(data.excelFile);

      // Save to Cloud with Encryption
      if (currentUser) {
        try {
          const sensitiveData = {
            results: data.results,
            excelFile: data.excelFile,
            studentCount: data.results.length,
            averageScore: Math.round(data.results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / data.results.length)
          };

          const encrypted = encryptionService.encrypt(sensitiveData, currentUser.uid);

          await addDoc(collection(db, 'exams'), {
            userId: currentUser.uid,
            timestamp: new Date().toISOString(),
            encryptedData: encrypted // Only encrypted blob is saved
          });
        } catch (saveError) {
          console.error("Cloud save failed", saveError);
          // Don't block the user, just log
        }
      }

    } catch (err) {
      setError('שגיאה בתהליך הבדיקה. וודא שהשרת רץ ושכל הקבצים תקינים.');
    } finally {
      setIsGrading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setExcelFile(null);
    setError(null);
  };

  const loadExamFromHistory = (exam) => {
    setResults(exam.results);
    setExcelFile(exam.excelFile);
    setError(null);
  };

  if (!currentUser) {
    return (
      <div className="container">
        <h1>AI Exam Grader 🤖</h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#64748b' }}>
          מערכת מאובטחת לבדיקת מבחנים
        </p>

        <MagicLinkLogin />
      </div>
    );
  }

  return (
    <div className="container">
      <header className="app-header">
        <div className="user-menu">
          <span className="welcome-msg">שלום, {userProfile?.displayName || currentUser.email}</span>
          <button className="history-btn" onClick={() => setShowHistory(true)}>
            📂 היסטוריה
          </button>
          <button className="btn-secondary" onClick={() => logout()}>התנתק</button>
        </div>
      </header>

      {/* Privacy Notice Banner */}
      <div className="privacy-banner">
        🔒 הנתונים מוצפנים ונשמרים בענן המאובטח.
        <button className="privacy-link" onClick={() => setShowPrivacy(true)}>
          קרא עוד
        </button>
      </div>

      <UploadSection onFilesSelected={handleGrade} isGrading={isGrading} />

      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <ResultsTable results={results} excelFile={excelFile} />

      {results && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button className="clear-btn" onClick={clearResults}>
            🗑️ נקה מסך
          </button>
        </div>
      )}

      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />

      <CloudHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadExam={loadExamFromHistory}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
