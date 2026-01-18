
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable
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

// THE PROMPT ENGINE
// optimization: Creates a focused system instruction based on the specific rubric
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

async function gradeExam(examFileBuffer, examMimeType, rubricText, submissionFileBuffer, submissionMimeType) {
    // Using gemini-1.5-pro for maximum accuracy and reasoning capabilities
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = constructOptimizedPrompt(rubricText);

    const imageParts = [
        fileToGenerativePart(submissionFileBuffer, submissionMimeType)
    ];

    // If exam is provided as a file, add it too (optional context)
    if (examFileBuffer) {
        // We prepend the exam file so the model sees the blank exam first (context), then the submission
        imageParts.unshift(fileToGenerativePart(examFileBuffer, examMimeType));
        imageParts.unshift({ text: "Here is the BLANK EXAM TEMPLATE for reference:" });
    }

    imageParts.push({ text: "Here is the STUDENT SUBMISSION to grade:" });

    // Add the system prompt at the end or as a system instruction (for simplicity we send it as text part with the request)
    // In strict Gemini 1.5, system instructions are a separate param, but text parts work well too.
    const parts = [
        { text: prompt },
        ...imageParts
    ];

    try {
        constresult = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);

    } catch (error) {
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

module.exports = { gradeExam };
