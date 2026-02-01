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
async function generateOptimalPrompt(examFileBuffer, examMimeType, solvedExamBuffer, solvedExamMimeType, userRubricText, firstSubmissionBuffer, firstSubmissionMimeType) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const hasRubric = userRubricText && userRubricText.trim().length > 0;
    const hasSolvedExam = solvedExamBuffer != null;
    const hasExamTemplate = examFileBuffer != null;

    const metaPrompt = `
    You are an expert prompt engineer specializing in educational assessment.
    Your task is to analyze the ${hasExamTemplate ? 'exam provided' : 'student submission (to understand the exam structure)'} and generate the PERFECT grading prompt.

    CRITICAL ANALYSIS TASKS:
    1. **Subject Detection**: Identify the subject (Math, Science, History, Hebrew, English, etc.)
    2. **Question Analysis**: Identify EVERY question, its type (multiple choice, open-ended, calculation, essay, etc.)
    3. **Point Value Estimation**: ${hasRubric ? 'Use the provided rubric for point values.' : 'ESTIMATE appropriate point values based on question complexity and type. Typical distribution: simple questions 5-10 points, complex questions 15-25 points. Total should be 100 points unless exam states otherwise.'}
    4. **Answer Key**: ${hasSolvedExam ? 'Extract the correct answers from the solved exam provided.' : 'DETERMINE the correct answers yourself based on your knowledge. You are an expert in this subject - figure out what the correct answers should be.'}
    5. **Partial Credit Rules**: Define specific criteria for partial credit:
       - Math: Give partial credit for correct method even if final answer is wrong
       - Essays: Consider structure, content, language
       - Multiple choice: No partial credit unless specifically noted
    6. **Handwriting Handling**: Account for common handwriting issues - if ambiguous, give benefit of the doubt
    7. **Alternative Answers**: Accept equivalent correct answers (e.g., 0.5 = 1/2 = 50%)

    ${hasRubric ? `USER'S GRADING INSTRUCTIONS (incorporate these):\n    ${userRubricText}` : 'NO RUBRIC PROVIDED - You must determine all grading criteria yourself based on the exam content.'}

    OUTPUT FORMAT:
    Return ONLY a complete grading prompt ready to use. The prompt must:
    - Be in the SAME LANGUAGE as the exam
    - Include the answer key you determined
    - Include point values for each question
    - Include partial credit rules
    - End with this exact JSON format requirement:
    {
        "studentName": "Student Name",
        "questions": [
            { "questionId": "1", "score": X, "maxScore": Y, "confidence": 0-100, "comment": "explanation" }
        ],
        "totalScore": X,
        "totalMaxScore": Y
    }
    `;

    const parts = [{ text: metaPrompt }];

    // Use exam template if available, otherwise use first student submission to understand structure
    if (hasExamTemplate) {
        parts.push({ text: "Here is the EXAM TEMPLATE to analyze:" });
        parts.push(fileToGenerativePart(examFileBuffer, examMimeType));
    } else if (firstSubmissionBuffer) {
        parts.push({ text: "No exam template provided. Analyze this STUDENT SUBMISSION to understand the exam structure and questions:" });
        parts.push(fileToGenerativePart(firstSubmissionBuffer, firstSubmissionMimeType));
    }

    if (solvedExamBuffer) {
        parts.push({ text: "Here is the SOLVED EXAM with correct answers - use these as the answer key:" });
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

        if (submissionFiles.length === 0) {
            return res.status(400).json({ error: 'Missing required files: student submissions' });
        }

        // STEP 1: Generate optimal prompt using Prompt Engine
        console.log("Step 1: Generating optimal grading prompt...");
        const firstSubmission = submissionFiles[0];
        let optimalPrompt = await generateOptimalPrompt(
            examFile ? examFile.buffer : null,
            examFile ? examFile.mimetype : null,
            solvedExamFile ? solvedExamFile.buffer : null,
            solvedExamFile ? solvedExamFile.mimetype : null,
            rubricText || '',
            firstSubmission.buffer,
            firstSubmission.mimetype
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
