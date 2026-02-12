
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

// PROMPT GENERATION ENGINE - Generate optimal grading prompt from exam analysis
async function generateOptimalPrompt(examFileBuffer, examMimeType, solvedExamFiles, userRubricText, specialInstructions, firstSubmissionBuffer, firstSubmissionMimeType) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const hasRubric = userRubricText && userRubricText.trim().length > 0;
    const hasSolvedExam = solvedExamFiles && solvedExamFiles.length > 0;
    const hasExamTemplate = examFileBuffer != null;
    const hasSpecialInstructions = specialInstructions && specialInstructions.trim().length > 0;

    const metaPrompt = `
    You are an expert prompt engineer and dedicated teaching assistant.
    Your goal is to analyze the provided documents and generate the PERFECT grading prompt for an AI that will grade student submissions.

    --- DOCUMENT ANALYSIS ---
    1. **Analyze the Exam Template** (if provided): Identify the subject, grade level, and list of questions.
    2. **Analyze the Solved Exams** (if provided): Extract the correct answers. Multiple solved exams or examples might be provided; synthesize the correct answers from all of them.
    3. **Analyze the Student Submission** (if provided): Use this to understand the exam structure if the template is missing.

    --- MISSING INFORMATION HANDLING ---
    ${!hasSolvedExam ? 'CRITICAL: NO SOLVED EXAM/ANSWER KEY PROVIDED. You must determine the correct answers yourself based on your expert knowledge of the subject. The grading prompt MUST include these correct answers.' : 'Use the provided Solved Exam(s) as the source of truth.'}
    ${!hasRubric ? 'CRITICAL: NO RUBRIC PROVIDED. You must determine the point distribution (total 100) and grading criteria yourself. Assign logical points based on question complexity.' : 'Use the provided Rubric for point values and criteria.'}

    --- USER INSTRUCTIONS ---
    ${hasSpecialInstructions ? `THE USER HAS PROVIDED THESE SPECIAL INSTRUCTIONS. THESE ARE PARAMOUNT:\n"${specialInstructions}"\n(Incorporate these primarily into the grading logic)` : 'No special instructions provided.'}
    ${hasRubric ? `User's Rubric:\n"${userRubricText}"` : ''}

    --- OUTPUT TASK ---
    Write a comprehensive grading prompt for the AI grader. The prompt should:
    1.  **Role**: Define the AI as an expert grader.
    2.  **Context**: Briefly describe the exam subject and structure.
    3.  **Answer Key**: EXPLICITLY LIST the correct answers for every question (derived from your analysis or the solved exams).
    4.  **Grading Criteria**: Explain how to grade each question (partial credit, key keywords, common mistakes).
    5.  **Special Handling**: Incorporate the user's special instructions (e.g., specific question filters, strictness levels).
    6.  **Output Format**: Enforce the required JSON structure.

    REQUIRED JSON STRUCTURE FOR THE FINAL PROMPT OUTPUT:
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

    if (hasSolvedExam) {
        solvedExamFiles.forEach((file, index) => {
            parts.push({ text: `Here is SOLVED EXAM #${index + 1} with correct answers - use this as the answer key:` });
            parts.push(fileToGenerativePart(file.buffer, file.mimetype));
        });
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

// Construct the grading prompt (Fallback)
function constructOptimizedPrompt(rubricText, specialInstructions, hasSolvedExam) {
    const solvedExamNote = hasSolvedExam
        ? `\n    IMPORTANT: SOLVED EXAM(S) provided. Use them as your primary reference for correct answers.`
        : `\n    IMPORTANT: NO SOLVED EXAM PROVIDED. You must determine the correct answers yourself based on the content.`;

    const specialInstructionsNote = specialInstructions
        ? `\n    USER SPECIAL INSTRUCTIONS (OVERRIDE DEFAULT RULES):\n    ${specialInstructions}`
        : '';

    return `
    You are an expert academic grader with advanced handwriting recognition capabilities.
    Your goal is to grade a student's handwritten exam submission with extreme precision.
    ${solvedExamNote}
    ${specialInstructionsNote}

    GRADING RUBRIC & INSTRUCTIONS:
    ${rubricText || 'No specific rubric provided. Use your best judgment for standard academic grading.'}

    STEP-BY-STEP REASONING (Internal Monologue):
    1. **Scan & Transcribe**: First, carefully read the handwritten student submission. If a word is ambiguous, look at the context.
    2. **Locate Student Name**: Find the student's name at the top of the document.
    3. **Determine Correct Answers**: Compare against the solved exam(s) (if present) or strictly derive the correct answer yourself.
    4. **Evaluate per Question**: Match each student answer to the corresponding rubric item.
    5. **Score & Verify**: Assign points. If you deduct points, explain why based on the rubric or solved exam.
    6. **Check Special Instructions**: Ensure you followed any special constraints set by the user (e.g., checking only prime questions).

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

async function gradeExam(generatedPrompt, examFileBuffer, examMimeType, submissionFileBuffer, submissionMimeType, solvedExamFiles) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const prompt = generatedPrompt;

    const imageParts = [];

    // Add blank exam template
    if (examFileBuffer) {
        imageParts.push({ text: "Here is the BLANK EXAM TEMPLATE for reference:" });
        imageParts.push(fileToGenerativePart(examFileBuffer, examMimeType));
    }

    // Add solved exams with correct answers
    if (solvedExamFiles && solvedExamFiles.length > 0) {
        solvedExamFiles.forEach((file, index) => {
            imageParts.push({ text: `Here is SOLVED EXAM #${index + 1} with CORRECT ANSWERS - use this as the answer key:` });
            imageParts.push(fileToGenerativePart(file.buffer, file.mimetype));
        });
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
        console.error("Grading error occurred", error);
        return {
            studentName: "Error",
            questions: [],
            totalScore: 0,
            totalMaxScore: 0,
            error: "Failed to grade submission: " + error.message
        };
    }
}

module.exports = { gradeExam, generateOptimalPrompt, constructOptimizedPrompt };
