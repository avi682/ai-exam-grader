import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function MagicLinkLogin() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const { sendLoginLink } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            await sendLoginLink(email);
            setStatus('success');
            setMessage('נשלח מייל לאימות! בדוק את תיבת הדואר שלך (לפעמים זה מגיע ל-Spam). לחץ על הקישור כדי להיכנס.');
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage('אירעה שגיאה בשליחת המייל: ' + error.message);
        }
    }

    if (status === 'success') {
        return (
            <div className="auth-card">
                <div style={{ textAlign: 'center' }}>
                    <h2>✉️ המייל בדרך!</h2>
                    <p>{message}</p>
                    <button className="btn-secondary" onClick={() => setStatus('idle')} style={{ marginTop: '20px' }}>
                        נסה שוב
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-card">
            <h2>✨ כניסה מהירה</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#ccc' }}>
                הכנס את המייל שלך ותקבל קישור קסם לכניסה מיידית בלי סיסמה.
            </p>

            {status === 'error' && <div className="error-alert">{message}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>אימייל</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        autoFocus
                    />
                </div>
                <button disabled={status === 'loading'} className="btn-primary w-100" type="submit">
                    {status === 'loading' ? 'שולח...' : 'שלח קישור כניסה'}
                </button>
            </form>

            <div style={{ fontSize: '10px', color: '#666', marginTop: '20px', textAlign: 'center' }}>
                Powered by Firebase Magic Link
            </div>
        </div>
    );
}
