/**
 * Correct local numbering computation using two-cursor approach
 */

export type Step = { type: 'same' | 'del' | 'add' | 'mod'; i?: number; j?: number };

/**
 * Compute unified display numbers using unified line numbering approach
 * 
 * This ensures:
 * - Sequential unified line numbering for display
 * - After insertions, left numbers continue in sequence
 * - Right numbers reflect actual right-side positions
 * - Numbers are 1-based unified display indices
 */
export function computeLocalNumbers(steps: Step[]) {
  const leftNums = new Array<number>(steps.length);
  const rightNums = new Array<number>(steps.length);
  
  let unifiedLineNum = 1; // unified display line number
  let rj = 1; // right source line number
  
  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    
    if (s.type === 'same') { 
      leftNums[k] = unifiedLineNum++; 
      rightNums[k] = rj++; 
      continue; 
    }
    
    if (s.type === 'mod') { 
      leftNums[k] = unifiedLineNum++; 
      rightNums[k] = rj++; 
      continue; 
    }
    
    if (s.type === 'del') { 
      leftNums[k] = unifiedLineNum++; 
      rightNums[k] = 0; // No right number for deletions
      continue; 
    }
    
    // type === 'add'
    leftNums[k] = 0; // No left number for additions
    rightNums[k] = rj++;
    unifiedLineNum++; // Increment unified line for next line after insertion
  }
  
  return { leftNums, rightNums };
}
