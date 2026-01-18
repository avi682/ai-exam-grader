
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { gradeExam } = require('./services/geminiService');
const { generateExcel } = require('./services/excelGenerator');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/grade', upload.fields([
    { name: 'exam', maxCount: 1 },
    // rubric is now sent as text field, not file
    { name: 'submissions', maxCount: 50 } // Allow multiple submissions
]), async (req, res) => {
    try {
        const examFile = req.files['exam'] ? req.files['exam'][0] : null;
        const rubricText = req.body.rubricText;
        const submissionFiles = req.files['submissions'] || [];

        if (!examFile || !rubricText || submissionFiles.length === 0) {
            return res.status(400).json({ error: 'Missing required files (exam, submissions) or rubric text' });
        }

        const results = [];

        // 2. Process each submission
        for (const submissionFile of submissionFiles) {
            // Privacy: No logging of file names

            // Pass raw file buffers to Gemini (Multimodal)
            const gradeResult = await gradeExam(
                examFile.buffer,
                examFile.mimetype,
                rubricText,
                submissionFile.buffer,
                submissionFile.mimetype
            );

            // Use extracted name from Gemini, or fallback to filename if unknown/empty
            let finalStudentName = gradeResult.studentName;
            if (!finalStudentName || finalStudentName === "Unknown" || finalStudentName === "Error") {
                finalStudentName = submissionFile.originalname.replace(/\.[^/.]+$/, "");
            }

            results.push({
                studentName: finalStudentName,
                ...gradeResult
            });
        }

        // 4. Generate Excel
        const excelBuffer = generateExcel(results);

        // 5. Build response
        res.json({
            results,
            excelFile: excelBuffer.toString('base64')
        });

    } catch (error) {
        console.error('Error processing exam:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
