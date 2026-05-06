import prisma from '../utils/prisma.js';

export interface GradeWeightConfig {
  assignment: number;
  weeklyExam: number;
  midterm: number;
  final: number;
}

const DEFAULT_WEIGHTS: GradeWeightConfig = {
  assignment: 0.2,
  weeklyExam: 0.2,
  midterm: 0.3,
  final: 0.3,
};

export interface CategoryScore {
  category: string;
  average: number;
  count: number;
  weight: number;
}

export interface FinalGradeResult {
  studentId: string;
  subjectId: string;
  finalScore: number;
  categories: CategoryScore[];
  usedWeights: GradeWeightConfig;
  isNormalized: boolean;
}

export class GradeCalculationService {
  /**
   * Calculate weighted final grade for a student in a subject.
   * If a category has no grades, its weight is redistributed among the others.
   */
  async calculateFinalGrade(
    studentId: string,
    subjectId: string,
    weights: GradeWeightConfig = DEFAULT_WEIGHTS
  ): Promise<FinalGradeResult> {
    // Fetch all grades for this student in this subject
    const grades = await prisma.grade.findMany({
      where: { studentId, subjectId },
      include: { assignment: true, exam: true },
    });

    // Group by category
    const categoryScores: Record<string, number[]> = {
      ASSIGNMENT: [],
      WEEKLY_EXAM: [],
      MIDTERM: [],
      FINAL: [],
    };

    for (const grade of grades) {
      let cat: string | null = null;
      if (grade.assignment?.category) {
        cat = grade.assignment.category;
      } else if (grade.exam?.category) {
        cat = grade.exam.category;
      } else if (grade.category) {
        cat = grade.category;
      }

      if (cat && categoryScores[cat]) {
        categoryScores[cat].push(grade.value);
      }
    }

    // Calculate averages per category
    const categoryAverages: Record<string, { avg: number; count: number }> = {};
    for (const [cat, scores] of Object.entries(categoryScores)) {
      if (scores.length > 0) {
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        categoryAverages[cat] = { avg, count: scores.length };
      }
    }

    // Determine which categories have data
    const hasAssignment = !!categoryAverages.ASSIGNMENT;
    const hasWeekly = !!categoryAverages.WEEKLY_EXAM;
    const hasMidterm = !!categoryAverages.MIDTERM;
    const hasFinal = !!categoryAverages.FINAL;

    // Build weight mapping
    const weightMap: Record<string, number> = {
      ASSIGNMENT: weights.assignment,
      WEEKLY_EXAM: weights.weeklyExam,
      MIDTERM: weights.midterm,
      FINAL: weights.final,
    };

    // Collect active categories and their total weight
    const activeCategories: string[] = [];
    let totalActiveWeight = 0;
    for (const [cat, info] of Object.entries(categoryAverages)) {
      activeCategories.push(cat);
      totalActiveWeight += weightMap[cat];
    }

    let isNormalized = false;
    let usedWeights = { ...weights };

    // If some categories are missing, normalize weights
    if (activeCategories.length < 4 && totalActiveWeight > 0) {
      isNormalized = true;
      for (const cat of activeCategories) {
        weightMap[cat] = weightMap[cat] / totalActiveWeight;
      }
      usedWeights = {
        assignment: weightMap.ASSIGNMENT || 0,
        weeklyExam: weightMap.WEEKLY_EXAM || 0,
        midterm: weightMap.MIDTERM || 0,
        final: weightMap.FINAL || 0,
      };
    }

    // Calculate final score
    let finalScore = 0;
    const resultCategories: CategoryScore[] = [];

    for (const [cat, info] of Object.entries(categoryAverages)) {
      const weighted = info.avg * weightMap[cat];
      finalScore += weighted;
      resultCategories.push({
        category: cat,
        average: info.avg,
        count: info.count,
        weight: weightMap[cat],
      });
    }

    return {
      studentId,
      subjectId,
      finalScore: Math.round(finalScore * 100) / 100,
      categories: resultCategories,
      usedWeights,
      isNormalized,
    };
  }

  /**
   * Calculate final grades for all subjects of a student
   */
  async calculateAllSubjectGrades(
    studentId: string,
    weights?: GradeWeightConfig
  ): Promise<FinalGradeResult[]> {
    // Get all subjects the student is enrolled in
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, isActive: true },
      select: { subjectId: true },
    });

    const subjectIds = [...new Set(enrollments.map((e) => e.subjectId))];

    const results: FinalGradeResult[] = [];
    for (const subjectId of subjectIds) {
      const result = await this.calculateFinalGrade(studentId, subjectId, weights);
      results.push(result);
    }

    return results;
  }
}

export const gradeCalculationService = new GradeCalculationService();
export default gradeCalculationService;
