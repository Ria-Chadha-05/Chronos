import type { CapacityReport } from '../capacity';
import { analyzeRealityGapIssues } from './RealityGapAnalyzer';
import type {
  RealityGapCommitment,
  RealityGapReport,
  RealityGapSeverity,
} from './RealityGapTypes';

function getSeverity(capacityScore: number, issueCount: number): RealityGapSeverity {
  if (capacityScore < 30 || issueCount >= 4) return 'High';
  if ((capacityScore >= 30 && capacityScore <= 60) || (issueCount >= 2 && issueCount <= 3)) return 'Medium';
  return 'Low';
}

function getRecommendation(severity: RealityGapSeverity): string {
  if (severity === 'High') return "Reduce today's workload or postpone low-priority commitments.";
  if (severity === 'Medium') return 'Protect focus time and avoid adding new commitments.';
  return "Today's plan appears realistic.";
}

function getSummary(severity: RealityGapSeverity, issues: string[]): string {
  if (!issues.length) return 'Everything looks achievable today.';
  if (severity === 'High') return `${issues.length} reality gaps detected. Today needs active rescheduling.`;
  if (severity === 'Medium') return `${issues.length} reality gaps detected. Keep the day protected.`;
  return 'Minor reality gaps detected, but the plan still looks manageable.';
}

export function calculateRealityGapReport(
  commitments: RealityGapCommitment[],
  capacityReport: CapacityReport,
): RealityGapReport {
  console.info('[Reality Gap] Analyzing commitments...');

  const analysis = analyzeRealityGapIssues({
    commitments,
    capacityReport,
  });
  const severity = getSeverity(capacityReport.score, analysis.issues.length);
  const report = {
    severity,
    issues: analysis.issues,
    summary: getSummary(severity, analysis.issues),
    recommendation: getRecommendation(severity),
  };

  console.info('[Reality Gap] Reality Gap Report generated', report);

  return report;
}
