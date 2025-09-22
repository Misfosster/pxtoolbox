/**
 * Golden corpus for diff engine testing
 * 
 * These fixtures define the expected behavior for all edge cases
 * and are used by both Vitest unit tests and Playwright E2E tests.
 */

export interface DiffStep {
  type: 'same' | 'del' | 'add' | 'mod';
  leftNum: number;
  rightNum: number;
}

export interface DiffStats {
  deleted: number;
  added: number;
  modified: number;
  unchanged: number;
}

export interface InlineSegment {
  text: string;
  type: 'same' | 'del' | 'add';
}

export interface EOFBadge {
  shouldShow: boolean;
  side: 'left' | 'right';
  message: string;
}

export interface GoldenTestCase {
  name: string;
  description: string;
  left: string;
  right: string;
  expectedSteps: DiffStep[];
  expectedStats: DiffStats;
  // Optional specialized test data
  withIgnoreEOL?: {
    expectedSteps: DiffStep[];
    expectedStats: DiffStats;
  };
  withoutIgnoreEOL?: {
    expectedSteps: DiffStep[];
    expectedStats: DiffStats;
  };
  eofBadge?: EOFBadge;
  inlineExpected?: {
    left: InlineSegment[];
    right: InlineSegment[];
  };
  unicodeSafety?: {
    zwjFamily?: string;
    flags?: string[];
    combining?: string[];
  };
  antiPatterns?: {
    [key: string]: string;
  };
}

/**
 * Load all golden test cases from JSON files
 */
export async function loadGoldenCorpus(): Promise<GoldenTestCase[]> {
  const fixtures: GoldenTestCase[] = [];
  
  // Import all fixture files
  const fixtureModules = [
    () => import('./01-foo-line-deletion.json'),
    () => import('./02-unicode-emoji.json'),
    () => import('./03-quotes-punctuation.json'),
    () => import('./04-mixed-scripts.json'),
    () => import('./05-line-endings.json'),
    () => import('./06-trailing-newline.json'),
    () => import('./07-n-not-equal-m.json'),
    () => import('./08-bazaz-bug.json'),
  ];
  
  for (const importFn of fixtureModules) {
    try {
      const module = await importFn();
      fixtures.push(module.default as GoldenTestCase);
    } catch (error) {
      console.warn(`Failed to load fixture:`, error);
    }
  }
  
  return fixtures;
}

/**
 * Validate that a test case has all required fields
 */
export function validateTestCase(testCase: Partial<GoldenTestCase>): testCase is GoldenTestCase {
  const required = ['name', 'description', 'left', 'right', 'expectedSteps', 'expectedStats'];
  
  for (const field of required) {
    if (!testCase.hasOwnProperty(field)) {
      console.error(`Missing required field: ${field} in test case: ${testCase.name || 'unknown'}`);
      return false;
    }
  }
  
  // Validate steps structure
  if (!Array.isArray(testCase.expectedSteps)) {
    console.error(`expectedSteps must be an array in: ${testCase.name}`);
    return false;
  }
  
  for (const step of testCase.expectedSteps!) {
    if (!['same', 'del', 'add', 'mod'].includes(step.type)) {
      console.error(`Invalid step type: ${step.type} in: ${testCase.name}`);
      return false;
    }
    
    if (typeof step.leftNum !== 'number' || typeof step.rightNum !== 'number') {
      console.error(`Invalid line numbers in step: ${JSON.stringify(step)} in: ${testCase.name}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Quick validation of invariants across all steps
 */
export function validateStepInvariants(steps: DiffStep[]): string[] {
  const errors: string[] = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    switch (step.type) {
      case 'del':
        if (step.rightNum !== 0) {
          errors.push(`Step ${i}: 'del' should have rightNum=0, got ${step.rightNum}`);
        }
        if (step.leftNum <= 0) {
          errors.push(`Step ${i}: 'del' should have leftNum>0, got ${step.leftNum}`);
        }
        break;
        
      case 'add':
        if (step.leftNum !== 0) {
          errors.push(`Step ${i}: 'add' should have leftNum=0, got ${step.leftNum}`);
        }
        if (step.rightNum <= 0) {
          errors.push(`Step ${i}: 'add' should have rightNum>0, got ${step.rightNum}`);
        }
        break;
        
      case 'mod':
        if (step.leftNum <= 0 || step.rightNum <= 0) {
          errors.push(`Step ${i}: 'mod' should have both nums>0, got left=${step.leftNum} right=${step.rightNum}`);
        }
        break;
        
      case 'same':
        if (step.leftNum <= 0 || step.rightNum <= 0) {
          errors.push(`Step ${i}: 'same' should have both nums>0, got left=${step.leftNum} right=${step.rightNum}`);
        }
        break;
    }
  }
  
  return errors;
}

/**
 * Calculate stats from steps (for validation)
 */
export function calculateStatsFromSteps(steps: DiffStep[]): DiffStats {
  return steps.reduce((stats, step) => {
    switch (step.type) {
      case 'del': stats.deleted++; break;
      case 'add': stats.added++; break;
      case 'mod': stats.modified++; break;
      case 'same': stats.unchanged++; break;
    }
    return stats;
  }, { deleted: 0, added: 0, modified: 0, unchanged: 0 });
}
