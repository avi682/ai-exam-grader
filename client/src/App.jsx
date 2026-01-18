
import React, { useState } from 'react';
import { UploadSection } from './components/UploadSection';
import { ResultsTable } from './components/ResultsTable';
import { PrivacyPolicy } from './components/PrivacyPolicy';

function App() {
  const [results, setResults] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [isGrading, setIsGrading] = useState(false);
  const [error, setError] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
    } catch (err) {
      // Privacy: No logging of errors
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

  return (
    <div className="container">
      {/* Privacy Notice Banner */}
      <div className="privacy-banner">
        🔒 הנתונים שלך מעובדים באופן מיידי ולא נשמרים.
        <button className="privacy-link" onClick={() => setShowPrivacy(true)}>
          קרא עוד
        </button>
      </div>

      <h1>AI Exam Grader 🤖</h1>
      <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#64748b' }}>
        מערכת אוטומטית לבדיקת מבחנים עם זיהוי רמת ביטחון
      </p>

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
            🗑️ מחק תוצאות מהזיכרון
          </button>
        </div>
      )}

      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}

export default App;

