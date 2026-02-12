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
    if (files.solvedExam && files.solvedExam.length > 0) {
      files.solvedExam.forEach(file => {
        formData.append('solvedExam', file);
      });
    }
    formData.append('rubricText', files.rubricText || '');
    formData.append('specialInstructions', files.specialInstructions || '');
    files.submissions.forEach(file => {
      formData.append('submissions', file);
    });

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.details) {
              errorMessage += `\nDetails: ${errorData.details}`;
            }
          }
        } catch (e) {
          // If json parsing fails, stick to status text
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResults(data.results);
      setExcelFile(data.excelFile);

    } catch (err) {
      setError(err.message || 'שגיאה בתהליך הבדיקה. וודא שהשרת רץ ושכל הקבצים תקינים.');
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

  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="container">
      <header className="app-header">
        <div className="user-menu" style={{ justifyContent: 'center', width: '100%' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>🤖 AI Exam Grader</h1>
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
          <strong>שגיאה:</strong> {error.split('\n')[0]}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={() => setShowDebug(!showDebug)}
              style={{ background: 'none', border: 'none', color: '#7f1d1d', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              {showDebug ? 'הסתר פרטים' : 'הצג פרטים טכניים'}
            </button>
            {showDebug && (
              <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.85rem', direction: 'ltr', textAlign: 'left', background: 'rgba(255,255,255,0.5)', padding: '8px', borderRadius: '4px' }}>
                {error}
              </pre>
            )}
          </div>
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
    </div>
  );
}

export default App;
