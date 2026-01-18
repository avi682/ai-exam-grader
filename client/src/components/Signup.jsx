import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function Signup({ setMode }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();

        if (password.length < 6) {
            return setError('הסיסמה חייבת להיות באורך 6 תווים לפחות');
        }

        try {
            setError('');
            setLoading(true);
            await signup(email, password, name);
            // Auth state change will handle redirect/view update in parent
        } catch (err) {
            console.error(err);
            setError('נכשל ביצירת חשבון: ' + err.message);
        }
        setLoading(false);
    }

    return (
        <div className="auth-card">
            <h2>📝 הרשמה</h2>
            {error && <div className="error-alert">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>שם מלא (מוצפן)</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>אימייל</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>סיסמה</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button disabled={loading} className="btn-primary w-100" type="submit">
                    הירשם
                </button>
            </form>
            <div className="auth-footer">
                כבר יש לך חשבון? <span onClick={() => setMode('login')} className="link">התחבר</span>
            </div>
        </div>
    );
}
