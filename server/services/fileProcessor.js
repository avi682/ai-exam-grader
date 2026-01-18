

const mammoth = require('mammoth');
// Polyfill for pdfjs-dist
if (!global.DOMMatrix) {
    global.DOMMatrix = class DOMMatrix {
        constructor() { return this; }
        toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
    }
}
const pdf = require('pdf-parse');

async function extractText(file) {
    const mimeType = file.mimetype;

    try {
        if (mimeType === 'application/pdf') {
            const dataBuffer = file.buffer;
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            return result.value;
        } else if (mimeType.startsWith('text/') || mimeType === 'application/json') {
            return file.buffer.toString('utf8');
        } else {
            // For now fallback to treating as text if not PDF/DOCX
            return file.buffer.toString('utf8');
        }
    } catch (error) {
        console.error(`Failed to extract text from ${file.originalname}:`, error);
        throw new Error(`Failed to read file ${file.originalname}`);
    }
}

module.exports = { extractText };
