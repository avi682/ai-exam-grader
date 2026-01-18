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

// Construct the grading prompt
function constructOptimizedPrompt(rubricText) {
    return `
    You are an expert academic grader with advanced handwriting recognition capabilities.
    Your goal is to grade a student's handwritten exam submission with extreme precision.

    GRADING RUBRIC & INSTRUCTIONS:
    ${rubricText}

    STEP-BY-STEP REASONING (Internal Monologue):
    1. **Scan & Transcribe**: First, carefully read the handwritten student submission. If a word is ambiguous, look at the context.
    2. **Locate Student Name**: Find the student's name at the top of the document.
    3. **Evaluate per Question**: Match each student answer to the corresponding rubric item.
    4. **Score & Verify**: Assign points. If you are deducted points, verify against the rubric.
    5. **Assess Confidence**:
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

// Grade a single exam
async function gradeExam(examFileBuffer, examMimeType, rubricText, submissionFileBuffer, submissionMimeType) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = constructOptimizedPrompt(rubricText);

    const imageParts = [
        fileToGenerativePart(submissionFileBuffer, submissionMimeType)
    ];

    if (examFileBuffer) {
        imageParts.unshift(fileToGenerativePart(examFileBuffer, examMimeType));
        imageParts.unshift({ text: "Here is the BLANK EXAM TEMPLATE for reference:" });
    }

    imageParts.push({ text: "Here is the STUDENT SUBMISSION to grade:" });

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

        const results = [];

        for (const submissionFile of submissionFiles) {
            const gradeResult = await gradeExam(
                examFile.buffer,
                examFile.mimetype,
                rubricText,
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
