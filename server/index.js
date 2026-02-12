
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { gradeExam, generateOptimalPrompt, constructOptimizedPrompt } = require('./services/geminiService');
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
    { name: 'solvedExam', maxCount: 1 },
    { name: 'submissions', maxCount: 50 }
]), async (req, res) => {
    try {
        const examFile = req.files['exam'] ? req.files['exam'][0] : null;
        const solvedExamFile = req.files['solvedExam'] ? req.files['solvedExam'][0] : null; // Support solved exam
        const rubricText = req.body.rubricText;
        const specialInstructions = req.body.specialInstructions; // Support special instructions
        const submissionFiles = req.files['submissions'] || [];

        // Only submissions are strictly required now
        if (submissionFiles.length === 0) {
            return res.status(400).json({ error: 'Missing required files: student submissions' });
        }

        console.log("Step 1: Generating optimal grading prompt...");
        const firstSubmission = submissionFiles[0];
        let optimalPrompt = await generateOptimalPrompt(
            examFile ? examFile.buffer : null,
            examFile ? examFile.mimetype : null,
            solvedExamFile ? solvedExamFile.buffer : null,
            solvedExamFile ? solvedExamFile.mimetype : null,
            rubricText || '',
            specialInstructions || '',
            firstSubmission.buffer,
            firstSubmission.mimetype
        );

        if (!optimalPrompt) {
            console.log("Using fallback prompt");
            optimalPrompt = constructOptimizedPrompt(rubricText, specialInstructions, solvedExamFile != null);
        }

        console.log("Step 2: Grading submissions...");
        const results = [];

        for (const submissionFile of submissionFiles) {
            const gradeResult = await gradeExam(
                optimalPrompt,
                examFile ? examFile.buffer : null,
                examFile ? examFile.mimetype : null,
                submissionFile.buffer,
                submissionFile.mimetype,
                solvedExamFile ? solvedExamFile.buffer : null,
                solvedExamFile ? solvedExamFile.mimetype : null
            );

            let finalStudentName = gradeResult.studentName;
            if (!finalStudentName || finalStudentName === "Unknown" || finalStudentName === "Error") {
                finalStudentName = submissionFile.originalname.replace(/\.[^/.]+$/, "");
            }

            results.push({
                studentName: finalStudentName,
                ...gradeResult
            });
        }

        const excelBuffer = generateExcel(results);

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
