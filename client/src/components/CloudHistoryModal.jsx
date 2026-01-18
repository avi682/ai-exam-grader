import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { encryptionService } from '../services/encryptionService';

export function CloudHistoryModal({ isOpen, onClose, onLoadExam }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchHistory();
        }
    }, [isOpen, currentUser]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'exams'),
                where('userId', '==', currentUser.uid),
                orderBy('timestamp', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const exams = querySnapshot.docs.map(doc => {
                const rawData = doc.data();
                let decrypted = null;
                try {
                    decrypted = encryptionService.decrypt(rawData.encryptedData, currentUser.uid);
                } catch (e) {
                    console.error("Decryption error", e);
                }

                return {
                    id: doc.id,
                    timestamp: rawData.timestamp,
                    ...decrypted // Spread decrypted fields (studentCount, averageScore, results, excelFile)
                };
            }).filter(exam => exam.results); // Filter out failed decryptions

            setHistory(exams);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
        setLoading(false);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('האם אתה בטוח שברצונך למחוק מבחן זה?')) {
            await deleteDoc(doc(db, 'exams', id));
            fetchHistory(); // Refresh list
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content history-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>☁️ היסטוריה מוצפנת בענן</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {loading ? (
                    <div className="empty-state">טוען נתונים מהענן...</div>
                ) : history.length === 0 ? (
                    <div className="empty-state">
                        <p>אין מבחנים שמורים עדיין.</p>
                    </div>
                ) : (
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
                )}
                <div className="modal-footer">
                    <p style={{ fontSize: '0.8rem', color: '#64748b' }}>🔒 הנתונים מוצפנים במפתח אישי.</p>
                </div>
            </div>
        </div>
    );
}
