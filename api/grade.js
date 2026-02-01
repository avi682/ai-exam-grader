const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to convert buffer to Gemini Part
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString("base64"),
            mimeType,
        },
    };
}

// PROMPT GENERATION ENGINE - Generate optimal grading prompt from exam analysis
async function generateOptimalPrompt(examFileBuffer, examMimeType, solvedExamBuffer, solvedExamMimeType, userRubricText) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const metaPrompt = `
    You are an expert prompt engineer specializing in educational assessment.
    Your task is to analyze the exam provided and generate the PERFECT grading prompt.

    ANALYZE THE EXAM AND CREATE A COMPREHENSIVE GRADING PROMPT THAT INCLUDES:
    1. **Subject Detection**: Identify the subject (Math, Science, History, etc.)
    2. **Question Analysis**: List each question, its type (multiple choice, open-ended, calculation, etc.), and point value
    3. **Answer Key Integration**: If a solved exam is provided, extract the correct answers
    4. **Grading Criteria**: Create specific criteria for partial credit for each question type
    5. **Edge Cases**: Handle common student mistakes, alternative correct answers, and ambiguous handwriting

    USER'S GRADING INSTRUCTIONS (incorporate these):
    ${userRubricText}

    OUTPUT FORMAT:
    Return ONLY a grading prompt (no JSON, no markdown). The prompt should be ready to use directly for grading student submissions.
    The prompt should be in the SAME LANGUAGE as the exam (if Hebrew exam, Hebrew prompt; if English exam, English prompt).
    
    Start your prompt with: "You are an expert grader for [subject] exams..."
    End with the exact JSON output format required.
    `;

    const parts = [
        { text: metaPrompt },
        { text: "Here is the EXAM TEMPLATE to analyze:" },
        fileToGenerativePart(examFileBuffer, examMimeType)
    ];

    if (solvedExamBuffer) {
        parts.push({ text: "Here is the SOLVED EXAM with correct answers:" });
        parts.push(fileToGenerativePart(solvedExamBuffer, solvedExamMimeType));
    }

    try {
        const result = await model.generateContent(parts);
        const response = await result.response;
        const generatedPrompt = response.text();

        console.log("Prompt Engine: Generated optimal prompt successfully");
        return generatedPrompt;
    } catch (error) {
        console.error("Prompt Engine: Failed to generate, using fallback");
        return null; // Will use default prompt
    }
}

// Construct the grading prompt
function constructOptimizedPrompt(rubricText, hasSolvedExam) {
    const solvedExamNote = hasSolvedExam
        ? `\n    IMPORTANT: You have been provided with a SOLVED EXAM showing the correct answers. Use this as your primary reference for grading. Compare the student's answers against the solved exam.`
        : '';

    return `
    You are an expert academic grader with advanced handwriting recognition capabilities.
    Your goal is to grade a student's handwritten exam submission with extreme precision.
    ${solvedExamNote}

    GRADING RUBRIC & INSTRUCTIONS:
    ${rubricText}

    STEP-BY-STEP REASONING (Internal Monologue):
    1. **Scan & Transcribe**: First, carefully read the handwritten student submission. If a word is ambiguous, look at the context.
    2. **Locate Student Name**: Find the student's name at the top of the document.
    3. **Compare to Correct Answers**: If a solved exam is provided, compare each student answer to the correct answer.
    4. **Evaluate per Question**: Match each student answer to the corresponding rubric item.
    5. **Score & Verify**: Assign points. If you deduct points, explain why based on the rubric or solved exam.
    6. **Assess Confidence**:
       - High Confidence (95-100%): Handwriting is legible, answer is clear.
       - Low Confidence (<95%): Handwriting is illegible, ambiguity in meaning, or page is blurry.

    OUTPUT FORMAT:
    Return pure JSON.
    {
        "studentName": "Extracted Name",
        "questions": [
            { "questionId": "1", "score": 10, "maxScore": 10, "confidence": 100, "comment": "Perfect answer." }
        ],
        "totalScore": 10,
        "totalMaxScore": 10
    }
    `;
}

// Grade a single exam using pre-generated prompt
async function gradeExam(generatedPrompt, examFileBuffer, examMimeType, submissionFileBuffer, submissionMimeType, solvedExamBuffer, solvedExamMimeType) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = generatedPrompt;

    const imageParts = [];

    // Add blank exam template
    if (examFileBuffer) {
        imageParts.push({ text: "Here is the BLANK EXAM TEMPLATE for reference:" });
        imageParts.push(fileToGenerativePart(examFileBuffer, examMimeType));
    }

    // Add solved exam with correct answers
    if (solvedExamBuffer) {
        imageParts.push({ text: "Here is the SOLVED EXAM with CORRECT ANSWERS - use this as the answer key:" });
        imageParts.push(fileToGenerativePart(solvedExamBuffer, solvedExamMimeType));
    }

    // Add student submission
    imageParts.push({ text: "Here is the STUDENT SUBMISSION to grade:" });
    imageParts.push(fileToGenerativePart(submissionFileBuffer, submissionMimeType));

    const parts = [
        { text: prompt },
        ...imageParts
    ];

    try {
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);

    } catch (error) {
        // Privacy: Don't log error details
        console.error("Grading error occurred");
        return {
            studentName: "Error",
            questions: [],
            totalScore: 0,
            totalMaxScore: 0,
            error: "Failed to grade submission"
        };
    }
}

// Parse multipart form data manually for Vercel
async function parseMultipartForm(req) {
    const busboy = require('busboy');

    return new Promise((resolve, reject) => {
        const files = {};
        const fields = {};

        const bb = busboy({ headers: req.headers });

        bb.on('file', (name, file, info) => {
            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                if (!files[name]) files[name] = [];
                files[name].push({
                    buffer: Buffer.concat(chunks),
                    originalname: info.filename,
                    mimetype: info.mimeType
                });
            });
        });

        bb.on('field', (name, value) => {
            fields[name] = value;
        });

        bb.on('finish', () => resolve({ files, fields }));
        bb.on('error', reject);

        req.pipe(bb);
    });
}

// Excel generation using xlsx
function generateExcel(results) {
    const XLSX = require('xlsx');

    const data = results.map(r => ({
        'שם תלמיד': r.studentName,
        'ציון': r.totalScore,
        'מקסימום': r.totalMaxScore,
        'אחוז': Math.round((r.totalScore / r.totalMaxScore) * 100) + '%',
        'הערות': r.questions?.map(q => q.comment).join('; ') || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Main handler
module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { files, fields } = await parseMultipartForm(req);

        const examFile = files['exam'] ? files['exam'][0] : null;
        const solvedExamFile = files['solvedExam'] ? files['solvedExam'][0] : null;
        const rubricText = fields['rubricText'];
        const submissionFiles = files['submissions'] || [];

        if (!examFile || !rubricText || submissionFiles.length === 0) {
            return res.status(400).json({ error: 'Missing required files or rubric text' });
        }

        // STEP 1: Generate optimal prompt using Prompt Engine
        console.log("Step 1: Generating optimal grading prompt...");
        let optimalPrompt = await generateOptimalPrompt(
            examFile.buffer,
            examFile.mimetype,
            solvedExamFile ? solvedExamFile.buffer : null,
            solvedExamFile ? solvedExamFile.mimetype : null,
            rubricText
        );

        // Fallback to default prompt if generation failed
        if (!optimalPrompt) {
            console.log("Using fallback prompt");
            optimalPrompt = constructOptimizedPrompt(rubricText, solvedExamFile != null);
        }

        // STEP 2: Grade each submission using the optimal prompt
        console.log("Step 2: Grading submissions with optimal prompt...");
        const results = [];

        for (const submissionFile of submissionFiles) {
            const gradeResult = await gradeExam(
                optimalPrompt,
                examFile.buffer,
                examFile.mimetype,
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
        console.error('Error processing request');
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Vercel config
module.exports.config = {
    api: {
        bodyParser: false
    }
};
