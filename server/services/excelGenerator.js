
const xlsx = require('xlsx');

function generateExcel(gradingResults) {
    // gradingResults is an array of objects: { studentName, questions: [...], totalScore, ... }

    // Flatten the data for the sheet
    // We want a row per student? Or a detailed view?
    // Requirement: "Returns grades in excel table by names... if not sure... write exactly which student which question..."

    // Let's make a summary sheet: Name | Total Score | Low Confidence Flags
    // And maybe detailed columns or separate sheet.

    // Flat structure: Name | Q1 Score | Q1 Confidence | Q2 Score | ... | Total

    // First, find all unique question IDs to build columns
    const allQuestionIds = new Set();
    gradingResults.forEach(res => {
        if (res.questions) {
            res.questions.forEach(q => allQuestionIds.add(q.questionId));
        }
    });
    const sortedQIds = Array.from(allQuestionIds).sort();

    const data = gradingResults.map(res => {
        const row = {
            'Student Name': res.studentName,
            'Total Score': res.totalScore
        };

        const lowConfidenceNotes = [];

        sortedQIds.forEach(qId => {
            const qData = res.questions ? res.questions.find(q => q.questionId === qId) : null;
            if (qData) {
                row[`${qId} Score`] = qData.score;
                // Check confidence
                if (qData.confidence < 95) {
                    row[`${qId} Flag`] = "⚠️ LOW CONFIDENCE";
                    lowConfidenceNotes.push(`${qId}: ${qData.uncertaintyReason || 'Uncertain'}`);
                } else {
                    row[`${qId} Flag`] = "OK";
                }
            } else {
                row[`${qId} Score`] = 0;
                row[`${qId} Flag`] = "N/A";
            }
        });

        row['Review Needed'] = lowConfidenceNotes.join('; ');
        return row;
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(wb, ws, "Grades");

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generateExcel };
