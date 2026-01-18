import React from 'react';
import { historyService } from '../services/historyService';

export function HistoryModal({ isOpen, onClose, onLoadExam }) {
    const [history, setHistory] = React.useState([]);

    React.useEffect(() => {
        if (isOpen) {
            setHistory(historyService.getHistory());
        }
    }, [isOpen]);

    const handleDelete = (id, e) => {
        e.stopPropagation();
        if (window.confirm('האם אתה בטוח שברצונך למחוק מבחן זה מההיסטוריה?')) {
            const updated = historyService.deleteExam(id);
            setHistory(updated);
        }
    };

    const clearAll = () => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק את כל ההיסטוריה? פעולה זו אינה הפיכה.')) {
            historyService.clearHistory();
            setHistory([]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content history-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📂 היסטוריית מבחנים</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {history.length === 0 ? (
                    <div className="empty-state">
                        <p>אין מבחנים שמורים בהיסטוריה עדיין.</p>
                    </div>
                ) : (
                    <>
                        <div className="history-list">
                            {history.map(exam => (
                                <div key={exam.id} className="history-item" onClick={() => { onLoadExam(exam); onClose(); }}>
                                    <div className="history-info">
                                        <span className="history-date">
                                            {new Date(exam.timestamp).toLocaleString('he-IL')}
                                        </span>
                                        <div className="history-details">
                                            <span className="badge">📝 {exam.studentCount} תלמידים</span>
                                            <span className="badge badge-success">ממוצע: {exam.averageScore}</span>
                                        </div>
                                    </div>
                                    <button className="delete-btn" onClick={(e) => handleDelete(exam.id, e)} title="מחק">
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="modal-footer">
                            <button className="clear-all-btn" onClick={clearAll}>מחק את כל ההיסטוריה</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
