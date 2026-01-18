import React, { useState } from 'react';
import { UploadSection } from './components/UploadSection';
import { ResultsTable } from './components/ResultsTable';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { HistoryModal } from './components/HistoryModal';
import { historyService } from './services/historyService';

function App() {
  const [results, setResults] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

      // Save to Local History automatically
      try {
        const examData = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          results: data.results,
          excelFile: data.excelFile,
          studentCount: data.results.length,
          averageScore: Math.round(data.results.reduce((sum, r) => sum + (r.totalScore || 0), 0) / data.results.length)
        };
        historyService.saveExam(examData);
      } catch (e) {
        console.error("Local save failed", e);
      }

    } catch (err) {
      setError('שגיאה בתהליך הבדיקה. וודא שהשרת רץ ושכל הקבצים תקינים.');
      console.error(err);
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

  return (
    <div className="container">
      <header className="app-header">
        <div className="user-menu" style={{ justifyContent: 'center', width: '100%' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🤖 AI Exam Grader</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <button className="history-btn" onClick={() => setShowHistory(true)}>
              📂 היסטוריה
            </button>
          </div>
        </div>
      </header>

      {/* Privacy Notice Banner */}
      <div className="privacy-banner">
        🔒 המערכת עובדת באופן מקומי וחד-פעמי. הנתונים לא נשמרים בענן.
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

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onLoadExam={loadExamFromHistory}
      />
    </div>
  );
}

export default App;
