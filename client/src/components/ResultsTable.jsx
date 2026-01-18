
import React from 'react';

export function ResultsTable({ results, excelFile }) {
    if (!results || results.length === 0) return null;

    const downloadExcel = () => {
        if (!excelFile) return;
        const link = document.createElement('a');
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelFile}`;
        link.download = 'exam_grades.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Get all unique question IDs for headers
    const questionIds = Array.from(new Set(
        results.flatMap(r => r.questions ? r.questions.map(q => q.questionId) : [])
    )).sort();

    // Analyze results for flags
    const flaggedResults = results.map((result, index) => {
        const issues = [];
        if (!result.studentName || result.studentName === 'Unknown') {
            issues.push('שם התלמיד לא זוהה (Unknown)');
        }

        result.questions?.forEach(q => {
            if (q.confidence < 95) {
                issues.push(`שאלה ${q.questionId}: רמת ביטחון נמוכה (${q.confidence}%). סיבה: ${q.uncertaintyReason || 'לא צוינה'}`);
            }
        });

        return issues.length > 0 ? { ...result, index, issues } : null;
    }).filter(r => r !== null);

    return (
        <div className="card">
            {flaggedResults.length > 0 && (
                <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '2rem'
                }}>
                    <h3 style={{ color: '#991b1b', marginTop: 0, display: 'flex', alignItems: 'center' }}>
                        ⚠️ שימ לב: {flaggedResults.length} מבחנים דורשים בדיקה ידנית
                    </h3>
                    <ul style={{ margin: 0, paddingRight: '20px' }}>
                        {flaggedResults.map((item, i) => (
                            <li key={i} style={{ marginBottom: '0.5rem', color: '#7f1d1d' }}>
                                <strong>{item.studentName !== 'Unknown' ? item.studentName : `קובץ #${item.index + 1}`}</strong>:
                                <ul style={{ marginTop: '0.25rem' }}>
                                    {item.issues.map((issue, j) => (
                                        <li key={j}>{issue}</li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>📊 תוצאות הבדיקה</h2>
                <button className="btn" onClick={downloadExcel}> הורד אקסל 📥</button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>שם התלמיד</th>
                            <th>ציון סופי</th>
                            {questionIds.map(qid => (
                                <th key={qid}>שאלה {qid}</th>
                            ))}
                            <th>הערות מערכת</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((student, idx) => {
                            const lowConfidence = student.questions?.some(q => q.confidence < 95);

                            return (
                                <tr key={idx} style={{ backgroundColor: lowConfidence ? '#fff7ed' : 'transparent' }}>
                                    <td>{student.studentName}</td>
                                    <td><strong>{student.totalScore}</strong></td>
                                    {questionIds.map(qid => {
                                        const q = student.questions?.find(sq => sq.questionId === qid);
                                        return (
                                            <td key={qid}>
                                                {q ? (
                                                    <div>
                                                        <span>{q.score}</span>
                                                        {q.confidence < 95 && (
                                                            <span title={q.uncertaintyReason} style={{ marginLeft: '5px', cursor: 'help' }}>⚠️</span>
                                                        )}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                        );
                                    })}
                                    <td>
                                        {lowConfidence ?
                                            <span className="badge badge-warning">נדרשת בדיקה ידנית</span> :
                                            <span className="badge badge-success">תקין</span>
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
