const STORAGE_KEY = 'exam_grader_history';

export const historyService = {
    saveExam: (examData) => {
        try {
            const history = historyService.getHistory();
            // Add new exam to the beginning
            const updatedHistory = [examData, ...history];
            // Limit to last 50 exams to prevent storage overflow
            if (updatedHistory.length > 50) {
                updatedHistory.length = 50;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
            return true;
        } catch (error) {
            console.error('Failed to save to history:', error);
            return false;
        }
    },

    getHistory: () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to read history:', error);
            return [];
        }
    },

    clearHistory: () => {
        localStorage.removeItem(STORAGE_KEY);
    },

    deleteExam: (id) => {
        try {
            const history = historyService.getHistory();
            const updatedHistory = history.filter(exam => exam.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
            return updatedHistory;
        } catch (error) {
            console.error('Failed to delete exam:', error);
            return [];
        }
    }
};
