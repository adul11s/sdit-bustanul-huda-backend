import { IFileValidationResult, IQuestionFileRow } from '../../interfaces/exam.types.js';

export class ExamParser {
  parseFile(content: string, fileName: string): IFileValidationResult {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return this.parseCSV(content);
    } else if (extension === 'xlsx' || extension === 'xls') {
      return this.parseXLSX(content);
    }

    return {
      isValid: false,
      errors: ['Unsupported file format. Use CSV or XLSX.'],
      validRows: [],
      totalRows: 0,
    };
  }

  private parseCSV(content: string): IFileValidationResult {
    const errors: string[] = [];
    const validRows: IQuestionFileRow[] = [];

    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return {
        isValid: false,
        errors: ['File is empty or has no data rows'],
        validRows: [],
        totalRows: 0,
      };
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredHeaders = ['question', 'type', 'score'];
    const optionalHeaders = ['option_a', 'option_b', 'option_c', 'option_d', 'correct_answer'];
    const headerMap: Record<string, number> = {};

    for (const h of [...requiredHeaders, ...optionalHeaders]) {
      const normalizedH = h.replace(/_/g, '').toLowerCase();
      const index = header.findIndex(headerName => {
        const normalizedHeader = headerName.replace(/_/g, '').toLowerCase();
        return normalizedHeader === normalizedH;
      });
      if (index !== -1) {
        headerMap[h] = index;
      }
    }

    for (const h of requiredHeaders) {
      if (headerMap[h] === undefined) {
        errors.push(`Missing required header: ${h}`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors, validRows: [], totalRows: 0 };
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      if (values.length < header.length) {
        errors.push(`Row ${i + 1}: Not enough columns`);
        continue;
      }

      const question = values[headerMap['question']]?.trim();
      const type = values[headerMap['type']]?.trim().toLowerCase();
      const scoreStr = values[headerMap['score']]?.trim();

      if (!question) {
        errors.push(`Row ${i + 1}: Missing question text`);
        continue;
      }
      if (!['mcq', 'essay'].includes(type)) {
        errors.push(`Row ${i + 1}: Invalid type "${type}". Use "mcq" or "essay"`);
        continue;
      }
      const score = parseFloat(scoreStr || '0');
      if (isNaN(score) || score <= 0) {
        errors.push(`Row ${i + 1}: Invalid score`);
        continue;
      }

      const row: IQuestionFileRow = {
        question,
        option_a: values[headerMap['option_a']]?.trim() || '',
        option_b: values[headerMap['option_b']]?.trim() || '',
        option_c: values[headerMap['option_c']]?.trim() || '',
        option_d: values[headerMap['option_d']]?.trim() || '',
        correct_answer: values[headerMap['correct_answer']]?.trim() || '',
        score,
        type,
      };

      if (type === 'mcq') {
        if (!['a', 'b', 'c', 'd'].includes(row.correct_answer.toLowerCase())) {
          errors.push(`Row ${i + 1}: Invalid correct answer "${row.correct_answer}". Use A, B, C, or D`);
          continue;
        }
        if (!row.option_a || !row.option_b || !row.option_c || !row.option_d) {
          errors.push(`Row ${i + 1}: All 4 options are required for MCQ`);
          continue;
        }
      }

      validRows.push(row);
    }

    return {
      isValid: errors.length === 0,
      errors,
      validRows,
      totalRows: lines.length - 1,
    };
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    return values;
  }

  private parseXLSX(content: string): IFileValidationResult {
    // For XLSX files, we need a proper parser library
    // This is a simplified version - in production, use 'xlsx' library
    const errors: string[] = [];
    
    try {
      // Basic check - in production, use xlsx library to parse
      if (!content || content.length === 0) {
        return {
          isValid: false,
          errors: ['Empty file'],
          validRows: [],
          totalRows: 0,
        };
      }

      // Try to detect CSV content even with xlsx extension
      if (content.includes(',') && content.includes('\n')) {
        return this.parseCSV(content);
      }

      errors.push('XLSX parsing requires xlsx library. Please use CSV format or convert to CSV.');
    } catch {
      errors.push('Failed to parse file');
    }

    return {
      isValid: false,
      errors,
      validRows: [],
      totalRows: 0,
    };
  }

  validateQuestionData(data: Partial<{ text: string; type: string; options: string[]; correctAnswer: string; score: number }>): string[] {
    const errors: string[] = [];

    if (!data.text?.trim()) {
      errors.push('Question text is required');
    }
    if (!['mcq', 'essay'].includes(data.type?.toLowerCase() || '')) {
      errors.push('Question type must be MCQ or ESSAY');
    }
    if (data.type?.toLowerCase() === 'mcq') {
      if (!data.options || data.options.length < 2) {
        errors.push('MCQ requires at least 2 options');
      }
      if (!['a', 'b', 'c', 'd'].includes(data.correctAnswer?.toUpperCase() || '')) {
        errors.push('MCQ correct answer must be A, B, C, or D');
      }
    }
    if (!data.score || data.score <= 0) {
      errors.push('Score must be greater than 0');
    }

    return errors;
  }
}

export const examParser = new ExamParser();