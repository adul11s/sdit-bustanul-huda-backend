import { Readable } from 'stream';
import { parse } from 'csv-parse';

export interface ParsedQuestion {
  text: string;
  type: 'MCQ' | 'ESSAY';
  options?: string[];
  correctAnswer: string;
  score: number;
  rowNumber: number;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: string[];
  totalRows: number;
}

/**
 * Parse CSV buffer into question objects
 * Expected columns: question,type,option_a,option_b,option_c,option_d,correct_answer,score
 */
export async function parseQuestionCSV(buffer: Buffer): Promise<ParseResult> {
  const result: ParseResult = { questions: [], errors: [], totalRows: 0 };

  const records: any[] = await new Promise((resolve, reject) => {
    const rows: any[] = [];
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    parser.on('data', (row) => rows.push(row));
    parser.on('end', () => resolve(rows));
    parser.on('error', (err) => reject(err));

    parser.write(buffer);
    parser.end();
  });

  result.totalRows = records.length;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // +2 because header is row 1 and we start at 0

    // Validate required fields
    if (!row.question || row.question.trim() === '') {
      result.errors.push(`Row ${rowNum}: Question text is required`);
      continue;
    }

    const type = (row.type || '').toUpperCase().trim();
    if (!['MCQ', 'ESSAY'].includes(type)) {
      result.errors.push(`Row ${rowNum}: Type must be 'MCQ' or 'ESSAY', got '${row.type}'`);
      continue;
    }

    const score = Number(row.score);
    if (isNaN(score) || score <= 0) {
      result.errors.push(`Row ${rowNum}: Score must be a positive number, got '${row.score}'`);
      continue;
    }

    const parsed: ParsedQuestion = {
      text: row.question.trim(),
      type: type as 'MCQ' | 'ESSAY',
      correctAnswer: (row.correct_answer || '').trim().toUpperCase(),
      score,
      rowNumber: rowNum,
    };

    if (type === 'MCQ') {
      const options = [
        row.option_a || row.optionA || '',
        row.option_b || row.optionB || '',
        row.option_c || row.optionC || '',
        row.option_d || row.optionD || '',
      ];

      if (options.some((o) => !o || o.trim() === '')) {
        result.errors.push(`Row ${rowNum}: MCQ questions require all 4 options (option_a, option_b, option_c, option_d)`);
        continue;
      }

      parsed.options = options.map((o) => o.trim());

      if (!parsed.correctAnswer || !['A', 'B', 'C', 'D'].includes(parsed.correctAnswer)) {
        result.errors.push(`Row ${rowNum}: MCQ requires a valid correct_answer (A, B, C, or D), got '${row.correct_answer}'`);
        continue;
      }
    } else {
      // Essay question
      parsed.correctAnswer = '';
      parsed.options = undefined;
    }

    result.questions.push(parsed);
  }

  return result;
}

/**
 * Generate a CSV template for question upload
 */
export function generateQuestionTemplate(): string {
  const header = 'question,type,option_a,option_b,option_c,option_d,correct_answer,score';
  const mcqExample = '"What is 5+5?","MCQ","8","9","10","11","C",10';
  const essayExample = '"Explain photosynthesis","ESSAY","","","","","",20';
  const mcqExample2 = '"What is capital of Indonesia?","MCQ","Bandung","Jakarta","Surabaya","Medan","B",10';

  return [header, mcqExample, essayExample, mcqExample2].join('\n');
}
