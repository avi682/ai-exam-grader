import React from 'react';

export function PrivacyPolicy({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="privacy-overlay" onClick={onClose}>
            <div className="privacy-modal" onClick={e => e.stopPropagation()}>
                <button className="privacy-close" onClick={onClose}>✕</button>

                <h2>🔒 מדיניות פרטיות</h2>

                <div className="privacy-content">
                    <section>
                        <h3>איך הנתונים שלך מעובדים</h3>
                        <ul>
                            <li>📤 <strong>עיבוד מיידי</strong> - הקבצים מעובדים ברגע ולא נשמרים בשרת</li>
                            <li>🗑️ <strong>מחיקה אוטומטית</strong> - הנתונים נמחקים מיד אחרי העיבוד</li>
                            <li>🚫 <strong>ללא אחסון</strong> - אין בסיס נתונים, אין שמירת מבחנים</li>
                        </ul>
                    </section>

                    <section>
                        <h3>שירותי צד שלישי</h3>
                        <div className="privacy-warning">
                            ⚠️ <strong>חשוב:</strong> הנתונים נשלחים ל-Google Gemini API לצורך עיבוד.
                            <br />
                            גוגל לא משתמשת בנתוני API לאימון מודלים לפי מדיניות השימוש שלהם.
                        </div>
                    </section>

                    <section>
                        <h3>מה אנחנו לא עושים</h3>
                        <ul>
                            <li>❌ לא שומרים מידע אישי</li>
                            <li>❌ לא משתמשים בעוגיות מעקב</li>
                            <li>❌ לא שומרים היסטוריית מבחנים</li>
                            <li>❌ לא משתפים נתונים עם צדדים שלישיים (מלבד Gemini)</li>
                        </ul>
                    </section>

                    <section>
                        <h3>המלצות</h3>
                        <ul>
                            <li>🔒 הפעילו את האתר מקומית לפרטיות מקסימלית</li>
                            <li>📝 אל תכללו מזהים אישיים בשמות קבצים</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
