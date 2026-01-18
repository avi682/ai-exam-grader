# מדריך העלאה והתקנה (Deployment)

מכיוון שהתקנת Git כבר בוצעה והקוד מוכן, הנה השלבים כדי להעלות את הפרויקט לאינטרנט כדי שתוכל לגשת אליו מכל מכשיר.

## שלב 1: העלאת הקוד ל-GitHub

אני כבר יצרתי מאגר Git מקומי ושמרתי (commit) את הקבצים שלך. כעת עליך לחבר אותו ל-GitHub.

1.  **היכנס ל-GitHub.com** וצור **New Repository** (מאגר חדש).
    *   תן לו שם, למשל `exam-grader`.
    *   **אל** תסמן את האפשרויות להוסיף README, .gitignore או License (כבר יש לנו אותם).
2.  **העתק את הפקודות** שמופיעות תחת הכותרת "…or push an existing repository from the command line". הן ייראו כך:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/exam-grader.git
    git push -u origin master
    ```
3.  **הרץ את הפקודות האלו** בטרמינל/שורת הפקודה בתוך תיקיית הפרויקט.

## שלב 2: העלאת השרת (Backend)

בשביל שהשרת (Node.js) ירוץ באינטרנט, נשתמש ב-**Render** (יש להם מסלול חינמי והם מתחברים בקלות ל-GitHub).

1.  היכנס ל-[dashboard.render.com](https://dashboard.render.com/) והירשם/התחבר עם GitHub.
2.  לחץ על **New +** -> **Web Service**.
3.  בחר את המאגר `exam-grader` שיצרת.
4.  הגדר את השירות:
    *   **Name**: `exam-grader-server`
    *   **Root Directory**: `server`
    *   **Environment**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
5.  **Environment Variables (משתני סביבה)**:
    *   גלול למטה ל-"Environment Variables" והוסף:
        *   Key: `GEMINI_API_KEY`
        *   Value: `YOUR_GEMINI_API_KEY` (המפתח שלך)
6.  לחץ על **Create Web Service**.
7.  **המתן לסיום ההתקנה**. בסיום, העתק את ה-**URL** שקיבלת (למשל `https://exam-grader-server.onrender.com`).

## שלב 3: חיבור צד-הלקוח (Frontend) לשרת

עכשיו שהשרת באוויר, צריך להגיד לאתר עצמו לאן לפנות.

1.  פתח את הקובץ `client/src/App.jsx` במחשב שלך.
2.  מצא את השורה שבה יש פנייה לכתובת (כנראה `http://localhost:3000/api/grade`).
3.  החלף את הכתובת ב-**URL החדש מ-Render** (משלב 2) בתוספת `/api/grade`.
    *   דוגמה: `https://exam-grader-server.onrender.com/api/grade`
4.  **שמור** את הקובץ ובצע עדכון ל-GitHub:
    ```bash
    git add .
    git commit -m "Update API URL to production server"
    git push
    ```

## שלב 4: העלאת האתר (Frontend)

נשתמש ב-**Vercel** עבור צד הלקוח (React) - זה מהיר וחינמי.

1.  היכנס ל-[vercel.com](https://vercel.com/) והירשם/התחבר עם GitHub.
2.  לחץ על **Add New...** -> **Project**.
3.  יבא (Import) את המאגר `exam-grader` שלך.
4.  הגדרת הפרויקט:
    *   **Framework Preset**: Vite (אמור לזהות לבד).
    *   **Root Directory**: לחץ על "Edit" ובחר בתיקייה `client`.
5.  לחץ על **Deploy**.

## שלב 5: כניסה מכל מכשיר

ברגע ש-Vercel יסיים, תקבל **כתובת דומיין** (למשל `https://exam-grader.vercel.app`).
*   כנס לקישור הזה מהטלפון, מהטאבלט או מכל מחשב אחר.
*   עכשיו אתה יכול להעלות מבחנים ולבדוק אותם מכל מקום!
