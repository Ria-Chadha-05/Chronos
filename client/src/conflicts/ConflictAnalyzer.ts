import {
  detectCapacityConflict,
  detectContextConflict,
  detectPriorityConflict,
  detectRecoveryConflict,
  detectTimeConflicts,
} from './ConflictDetector';
import type {
  Conflict,
  ConflictAnalysisInput,
  ConflictReport,
  ConflictSeverity,
} from './ConflictTypes';

function countSeverity(conflicts: Conflict[], severity: ConflictSeverity): number {
  return conflicts.filter(conflict => conflict.severity === severity).length;
}

function getSummary(conflicts: Conflict[], realitySeverity: string): string {
  if (!conflicts.length) return 'No scheduling conflicts detected.';

  const highSeverity = countSeverity(conflicts, 'High');
  const mediumSeverity = countSeverity(conflicts, 'Medium');

  if (highSeverity) {
    const issueLabel = highSeverity === 1 ? 'issue' : 'issues';
    return `${conflicts.length} scheduling conflicts detected, including ${highSeverity} high-severity ${issueLabel}. Reality check is ${realitySeverity}.`;
  }

  if (mediumSeverity) {
    return `${conflicts.length} scheduling conflicts detected. Protect recovery and focus time today.`;
  }

  return `${conflicts.length} low-severity scheduling conflicts detected.`;
}

export function analyzeConflicts({
  commitments,
  capacityReport,
  realityGapReport,
}: ConflictAnalysisInput): ConflictReport {
  console.info("[Conflict Detector] Analyzing today's commitments");

  const conflicts = [
    ...detectTimeConflicts(commitments),
    ...detectCapacityConflict(commitments, capacityReport),
    ...detectRecoveryConflict(commitments, capacityReport),
    ...detectContextConflict(commitments, capacityReport),
    ...detectPriorityConflict(commitments),
  ];

  console.info(`[Conflict Detector] Detected ${conflicts.length} conflicts`);

  const report = {
    totalConflicts: conflicts.length,
    highSeverity: countSeverity(conflicts, 'High'),
    mediumSeverity: countSeverity(conflicts, 'Medium'),
    lowSeverity: countSeverity(conflicts, 'Low'),
    conflicts,
    summary: getSummary(conflicts, realityGapReport.severity),
  };

  console.info('[Conflict Detector] Conflict Report generated', report);

  return report;
}
