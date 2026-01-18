import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Login({ setMode }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await login(email, password);
        } catch (err) {
            console.error(err);
            setError('שגיאה בהתחברות. בדוק את הפרטים ונסה שוב.');
        }
        setLoading(false);
    }

    return (
        <div className="auth-card">
            <h2>🔑 התחברות</h2>
            {error && <div className="error-alert">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>אימייל</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>סיסמה</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button disabled={loading} className="btn-primary w-100" type="submit">
                    התחבר
                </button>
            </form>
            <div className="auth-footer">
                אין לך חשבון? <span onClick={() => setMode('signup')} className="link">הירשם כאן</span>
            </div>
            <div style={{ fontSize: '10px', color: '#ccc', marginTop: '20px' }}>
                Debug Key: {JSON.parse(import.meta.env.VITE_FIREBASE_Config || '{}').apiKey || "AlzaSyAJIX81XcT9vZFJa7OL7fAoY4MVCDH5TWU"}
            </div>
        </div>
    );
}
