
import React, { useCallback, useState } from 'react';

export function UploadSection({ onFilesSelected, isGrading }) {
    const [files, setFiles] = useState({
        exam: null,
        submissions: []
    });
    const [rubricText, setRubricText] = useState('');
    const [dragActive, setDragActive] = useState({ exam: false, submissions: false });
    const [showModal, setShowModal] = useState(null); // 'exam' or 'submissions' or null

    const handleFileChange = (type, e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            if (type === 'submissions') {
                setFiles(prev => ({ ...prev, [type]: Array.from(selectedFiles) }));
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
                setFiles(prev => ({ ...prev, [type]: Array.from(droppedFiles) }));
            } else {
                setFiles(prev => ({ ...prev, [type]: droppedFiles[0] }));
            }
        }
    };

    const handleSubmit = () => {
        onFilesSelected({ ...files, rubricText });
    };

    const isReady = files.exam && rubricText.trim().length > 0 && files.submissions.length > 0;

    const FileListModal = ({ type, filesList, onClose }) => {
        if (!filesList) return null;
        const list = Array.isArray(filesList) ? filesList : [filesList];

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <h3>{type === 'exam' ? 'שאלון המבחן' : 'מבחני תלמידים'} ({list.length})</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {list.map((file, idx) => (
                            <div key={idx} className="file-list-item">
                                <span className="file-icon">📄</span>
                                <span style={{ direction: 'ltr', textAlign: 'left', flex: 1 }}>{file.name}</span>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                    {(file.size / 1024).toFixed(1)} KB
                                </span>
                            </div>
                        ))}
                    </div>
                    <button className="btn close-modal-btn" onClick={onClose}>סגור</button>
                </div>
            </div>
        );
    };

    return (
        <div className="card">
            <h2>📄 העלאת קבצים</h2>
            <div className="upload-grid">
                <div
                    className={`upload-zone ${dragActive.exam ? 'drag-active' : ''} ${files.exam ? 'file-selected' : ''}`}
                    onDragEnter={(e) => handleDrag('exam', e)}
                    onDragLeave={(e) => handleDrag('exam', e)}
                    onDragOver={(e) => handleDrag('exam', e)}
                    onDrop={(e) => handleDrop('exam', e)}
                >
                    <h3>1. שאלון המבחן (Exam)</h3>
                    <p className="text-dim">
                        {files.exam ? `נבחר: ${files.exam.name}` : 'גרור קובץ לכאן או לחץ לבחירה'}
                    </p>
                    {files.exam && (
                        <div className="file-counter">1</div>
                    )}
                    {files.exam && (
                        <button className="view-files-btn" onClick={(e) => {
                            e.preventDefault(); // Prevent file picker opening
                            setShowModal('exam');
                        }}>👁️ הצג קובץ</button>
                    )}
                    <input type="file" onChange={(e) => handleFileChange('exam', e)} accept=".pdf,.txt,.md,.docx" />
                </div>

                <div className="upload-zone" style={{ gridColumn: '1 / -1' }}>
                    <h3>2. מחוון / הוראות בדיקה (Rubric)</h3>
                    <p className="text-dim">כתוב כאן את התשובות הנכונות ואת הניקוד לכל שאלה</p>
                    <textarea
                        value={rubricText}
                        onChange={(e) => setRubricText(e.target.value)}
                        placeholder="שאלה 1: התשובה היא X (10 נקודות)..."
                        rows={6}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                </div>

                <div
                    className={`upload-zone ${dragActive.submissions ? 'drag-active' : ''} ${files.submissions.length > 0 ? 'file-selected' : ''}`}
                    onDragEnter={(e) => handleDrag('submissions', e)}
                    onDragLeave={(e) => handleDrag('submissions', e)}
                    onDragOver={(e) => handleDrag('submissions', e)}
                    onDrop={(e) => handleDrop('submissions', e)}
                    style={{ gridColumn: '1 / -1' }}
                >
                    <h3>3. מבחני תלמידים (Submissions)</h3>
                    <p className="text-dim">
                        {files.submissions.length > 0 ? `נבחרו ${files.submissions.length} קבצים` : 'גרור תיקייה/קבצים לכאן או לחץ לבחירה'}
                    </p>
                    {files.submissions.length > 0 && (
                        <div className="file-counter">{files.submissions.length}</div>
                    )}
                    {files.submissions.length > 0 && (
                        <button className="view-files-btn" onClick={(e) => {
                            e.preventDefault();
                            setShowModal('submissions');
                        }}>👁️ הצג רשימה ({files.submissions.length})</button>
                    )}
                    <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileChange('submissions', e)}
                        accept=".pdf,.txt,.md,.docx"
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
                    filesList={showModal === 'exam' ? files.exam : files.submissions}
                    onClose={() => setShowModal(null)}
                />
            )}
        </div>
    );
}
