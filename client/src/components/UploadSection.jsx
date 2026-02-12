import React, { useCallback, useState } from 'react';

export function UploadSection({ onFilesSelected, isGrading }) {
    const [files, setFiles] = useState({
        exam: null,
        solvedExam: null,
        submissions: []
    });
    const [rubricText, setRubricText] = useState('');
    const [specialInstructions, setSpecialInstructions] = useState('');
    const [dragActive, setDragActive] = useState({ exam: false, solvedExam: false, submissions: false });
    const [showModal, setShowModal] = useState(null); // 'exam', 'solvedExam', 'submissions' or null

    const handleFileChange = (type, e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            if (type === 'submissions') {
                setFiles(prev => ({
                    ...prev,
                    [type]: [...prev.submissions, ...Array.from(selectedFiles)]
                }));
            } else {
                setFiles(prev => ({ ...prev, [type]: selectedFiles[0] }));
            }
        }
    };

    const handleDrag = (type, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(prev => ({ ...prev, [type]: true }));
        } else if (e.type === "dragleave") {
            setDragActive(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleDrop = (type, e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(prev => ({ ...prev, [type]: false }));

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            if (type === 'submissions') {
                setFiles(prev => ({
                    ...prev,
                    [type]: [...prev.submissions, ...Array.from(droppedFiles)]
                }));
            } else {
                setFiles(prev => ({ ...prev, [type]: droppedFiles[0] }));
            }
        }
    };

    // Remove file function
    const handleRemoveFile = (type, index = null) => {
        if (type === 'submissions' && index !== null) {
            setFiles(prev => ({
                ...prev,
                submissions: prev.submissions.filter((_, i) => i !== index)
            }));
        } else {
            setFiles(prev => ({ ...prev, [type]: type === 'submissions' ? [] : null }));
        }
    };

    const handleSubmit = () => {
        onFilesSelected({ ...files, rubricText, specialInstructions });
    };

    const isReady = files.submissions.length > 0;

    const FileListModal = ({ type, filesList, onClose, onRemoveFile }) => {
        if (!filesList) return null;
        const list = Array.isArray(filesList) ? filesList : [filesList];

        let title = '';
        if (type === 'exam') title = 'שאלון המבחן';
        else if (type === 'solvedExam') title = 'מבחן פתור';
        else title = 'מבחני תלמידים';

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>{title} ({list.length})</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {list.map((file, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px',
                                borderBottom: '1px solid #333',
                                background: '#1e1e1e'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>📄</span>
                                <span style={{ direction: 'ltr', textAlign: 'left', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>{file.name}</span>
                                <span style={{ fontSize: '0.8rem', color: '#888', whiteSpace: 'nowrap' }}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFile(type, type === 'submissions' ? idx : null);
                                        if (list.length <= 1) onClose();
                                    }}
                                    style={{
                                        background: '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        fontSize: '1.1rem',
                                        fontWeight: 'bold',
                                        minWidth: '50px'
                                    }}
                                    title="מחק קובץ"
                                >🗑️</button>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem' }}>
                        {type === 'submissions' && list.length > 0 && (
                            <button className="btn" style={{ background: '#ef4444' }} onClick={() => { onRemoveFile('submissions'); onClose(); }}>מחק הכל</button>
                        )}
                        <button className="btn close-modal-btn" onClick={onClose}>סגור</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="card">
            <h2>📄 העלאת קבצים</h2>
            <div className="upload-grid">
                {/* 1. Blank Exam (Optional) */}
                <div
                    className={`upload-zone ${dragActive.exam ? 'drag-active' : ''} ${files.exam ? 'file-selected' : ''}`}
                    onDragEnter={(e) => handleDrag('exam', e)}
                    onDragLeave={(e) => handleDrag('exam', e)}
                    onDragOver={(e) => handleDrag('exam', e)}
                    onDrop={(e) => handleDrop('exam', e)}
                >
                    <h3>1. שאלון המבחן (אופציונלי)</h3>
                    <p className="text-dim">
                        {files.exam ? `נבחר: ${files.exam.name}` : 'מומלץ לדיוק טוב יותר'}
                    </p>
                    {files.exam && <div className="file-counter">1</div>}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {files.exam && (
                            <button className="view-files-btn" onClick={(e) => {
                                e.preventDefault();
                                setShowModal('exam');
                            }}>👁️ הצג</button>
                        )}
                        {files.exam && (
                            <button className="view-files-btn" style={{ background: '#ef4444' }} onClick={(e) => {
                                e.preventDefault();
                                handleRemoveFile('exam');
                            }}>🗑️ מחק</button>
                        )}
                    </div>
                    <input type="file" onChange={(e) => handleFileChange('exam', e)} accept=".pdf,.txt,.md,.docx,.jpg,.jpeg,.png" />
                </div>

                {/* 2. Solved Exam (Optional but Recommended) */}
                <div
                    className={`upload-zone ${dragActive.solvedExam ? 'drag-active' : ''} ${files.solvedExam ? 'file-selected' : ''}`}
                    onDragEnter={(e) => handleDrag('solvedExam', e)}
                    onDragLeave={(e) => handleDrag('solvedExam', e)}
                    onDragOver={(e) => handleDrag('solvedExam', e)}
                    onDrop={(e) => handleDrop('solvedExam', e)}
                >
                    <h3>2. מבחן פתור / דוגמה (אופציונלי)</h3>
                    <p className="text-dim">
                        {files.solvedExam ? `נבחר: ${files.solvedExam.name}` : 'מומלץ! גרור מבחן פתור לדוגמה'}
                    </p>
                    {files.solvedExam && <div className="file-counter">1</div>}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {files.solvedExam && (
                            <button className="view-files-btn" onClick={(e) => {
                                e.preventDefault();
                                setShowModal('solvedExam');
                            }}>👁️ הצג</button>
                        )}
                        {files.solvedExam && (
                            <button className="view-files-btn" style={{ background: '#ef4444' }} onClick={(e) => {
                                e.preventDefault();
                                handleRemoveFile('solvedExam');
                            }}>🗑️ מחק</button>
                        )}
                    </div>
                    <input type="file" onChange={(e) => handleFileChange('solvedExam', e)} accept=".pdf,.txt,.md,.docx,.jpg,.jpeg,.png" />
                </div>

                {/* 3. Rubric (Optional) */}
                <div className="upload-zone" style={{ gridColumn: '1 / -1' }}>
                    <h3>3. מחוון / הוראות בדיקה (אופציונלי)</h3>
                    <p className="text-dim">אם לא תכתוב מחוון, המערכת תזהה אוטומטית את התשובות הנכונות ואת הניקוד</p>
                    <textarea
                        value={rubricText}
                        onChange={(e) => setRubricText(e.target.value)}
                        placeholder="אופציונלי: תשובות נכונות, ניקוד מפורט, הערות..."
                        rows={4}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>

                {/* 3.5 Special Instructions */}
                <div className="upload-zone special-instructions-zone" style={{ gridColumn: '1 / -1' }}>
                    <h3>📝 הוראות מיוחדות (אופציונלי)</h3>
                    <p className="text-dim">כתוב כאן הנחיות מיוחדות ל-AI, למשל: תשובות, סינון שאלות, דגשים מיוחדים</p>
                    <textarea
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder={'דוגמאות:\n• "התשובות לשאלה 3: א. 42, ב. 17, ג. 8"\n• "בדוק רק שאלות עם מספר ראשוני (2,3,5,7...)"\n• "אל תוריד נקודות על שגיאות כתיב"\n• "תן ניקוד חלקי על דרך פתרון נכונה גם אם התשובה הסופית שגויה"'}
                        rows={5}
                        className="special-instructions-textarea"
                    />
                </div>

                {/* 4. Submissions */}
                <div
                    className={`upload-zone ${dragActive.submissions ? 'drag-active' : ''} ${files.submissions.length > 0 ? 'file-selected' : ''}`}
                    onDragEnter={(e) => handleDrag('submissions', e)}
                    onDragLeave={(e) => handleDrag('submissions', e)}
                    onDragOver={(e) => handleDrag('submissions', e)}
                    onDrop={(e) => handleDrop('submissions', e)}
                    style={{ gridColumn: '1 / -1' }}
                >
                    <h3>4. מבחני תלמידים (חובה)</h3>
                    <p className="text-dim">
                        {files.submissions.length === 0
                            ? 'גרור תיקייה/קבצים לכאן או לחץ לבחירה'
                            : files.submissions.length === 1
                                ? `נבחר קובץ אחד`
                                : `נבחרו ${files.submissions.length} קבצים`}
                    </p>
                    {files.submissions.length > 0 && <div className="file-counter">{files.submissions.length}</div>}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {files.submissions.length > 0 && (
                            <button className="view-files-btn" onClick={(e) => {
                                e.preventDefault();
                                setShowModal('submissions');
                            }}>👁️ הצג רשימה</button>
                        )}
                        {files.submissions.length > 0 && (
                            <button className="view-files-btn" style={{ background: '#ef4444' }} onClick={(e) => {
                                e.preventDefault();
                                handleRemoveFile('submissions');
                            }}>🗑️ מחק הכל</button>
                        )}
                    </div>
                    <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileChange('submissions', e)}
                        accept=".pdf,.txt,.md,.docx,.jpg,.jpeg,.png"
                    />
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                    className="btn"
                    disabled={!isReady || isGrading}
                    onClick={handleSubmit}
                >
                    {isGrading ? 'בודק מבחנים...' : 'התחל בדיקה 🚀'}
                </button>
            </div>

            {showModal && (
                <FileListModal
                    type={showModal}
                    filesList={
                        showModal === 'exam' ? files.exam :
                            showModal === 'solvedExam' ? files.solvedExam :
                                files.submissions
                    }
                    onClose={() => setShowModal(null)}
                    onRemoveFile={handleRemoveFile}
                />
            )}
        </div>
    );
}
