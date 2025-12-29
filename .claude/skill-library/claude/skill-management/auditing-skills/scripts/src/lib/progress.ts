/**
 * Progress checker - shows remediation metrics
 */

import { Phase1DescriptionFormat } from './phases/phase1-description-format.js';
import { Phase2AllowedTools } from './phases/phase2-allowed-tools.js';
import { Phase3LineCount } from './phases/phase3-line-count.js';
import { Phase4BrokenLinks } from './phases/phase4-broken-links.js';
import { Phase5OrganizeFiles } from './phases/phase5-organize-files.js';
import { Phase7OutputDirectory } from './phases/phase7-output-directory.js';
import { SkillParser } from './utils/skill-parser.js';
import chalk from 'chalk';

interface FullMetrics {
  totalSkills: number;
  phase1: {
    compliant: number;
    percentage: number;
  };
  phase2: {
    hasField: number;
    percentage: number;
  };
  phase3: {
    safe: number;      // < 350 lines
    caution: number;   // 350-450 lines
    warning: number;   // 450-500 lines
    critical: number;  // > 500 lines
    percentage: number;
  };
  phase4: {
    cleanLinks: number;
    brokenLinks: number;
    skillsWithBroken: number;
    percentage: number;
  };
  phase5: {
    cleanOrg: number;
    orphanedFiles: number;
    skillsWithOrphans: number;
    percentage: number;
  };
  phase7: {
    hasPattern: number;
    needsPattern: number;
    looseFiles: number;
    percentage: number;
  };
  overallScore: number;
}

export class ProgressChecker {
  constructor(private skillsDir: string) {}

  /**
   * Check progress on all phases
   */
  async check(): Promise<FullMetrics> {
    console.log(chalk.gray('Calculating metrics...\n'));

    const skillPaths = await SkillParser.findAllSkills(this.skillsDir);
    const totalSkills = skillPaths.length;

    // Phase 1 metrics
    const phase1 = await Phase1DescriptionFormat.getCompliance(this.skillsDir);

    // Phase 2 metrics
    const phase2 = await Phase2AllowedTools.getCompliance(this.skillsDir);

    // Phase 3 metrics
    const phase3 = await Phase3LineCount.getStatistics(this.skillsDir);

    // Phase 4 metrics
    const phase4 = await Phase4BrokenLinks.getStatistics(this.skillsDir);

    // Phase 5 metrics
    const phase5 = await Phase5OrganizeFiles.getStatistics(this.skillsDir);

    // Phase 7 metrics
    const phase7 = await Phase7OutputDirectory.getStatistics(this.skillsDir);

    // Overall score (weighted)
    // Phase 1: 25% (critical for activation)
    // Phase 2: 15% (important for documentation)
    // Phase 3: 20% (important for performance)
    // Phase 4: 15% (important for usability)
    // Phase 5: 15% (nice to have)
    // Phase 7: 10% (best practice)
    const overallScore =
      phase1.percentage * 0.25 +
      phase2.percentage * 0.15 +
      phase3.percentage * 0.20 +
      phase4.percentage * 0.15 +
      phase5.percentage * 0.15 +
      phase7.percentage * 0.10;

    return {
      totalSkills,
      phase1: {
        compliant: phase1.compliant,
        percentage: phase1.percentage,
      },
      phase2: {
        hasField: phase2.hasField,
        percentage: phase2.percentage,
      },
      phase3: {
        safe: phase3.safe,
        caution: phase3.caution,
        warning: phase3.warning,
        critical: phase3.critical,
        percentage: phase3.percentage,
      },
      phase4: {
        cleanLinks: phase4.cleanLinks,
        brokenLinks: phase4.brokenLinks,
        skillsWithBroken: phase4.skillsWithBroken,
        percentage: phase4.percentage,
      },
      phase5: {
        cleanOrg: phase5.cleanOrg,
        orphanedFiles: phase5.orphanedFiles,
        skillsWithOrphans: phase5.skillsWithOrphans,
        percentage: phase5.percentage,
      },
      phase7: {
        hasPattern: phase7.hasPattern,
        needsPattern: phase7.needsPattern,
        looseFiles: phase7.looseFiles,
        percentage: phase7.percentage,
      },
      overallScore,
    };
  }

  /**
   * Display metrics in formatted output
   */
  display(metrics: FullMetrics): void {
    console.log(chalk.bold('Total Skills:'), metrics.totalSkills);
    console.log();

    // Phase 1
    console.log(chalk.bold('Phase 1: Description Format'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(
      `  Compliant: ${metrics.phase1.compliant}/${metrics.totalSkills} (${metrics.phase1.percentage.toFixed(1)}%)`
    );

    if (metrics.phase1.percentage === 100) {
      console.log(chalk.green('  Status: ✅ COMPLETE'));
    } else {
      const remaining = metrics.totalSkills - metrics.phase1.compliant;
      console.log(chalk.yellow(`  Status: ⚠️  ${remaining} skills need fixing`));
    }
    console.log();

    // Phase 2
    console.log(chalk.bold('Phase 2: Allowed-Tools Field'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(
      `  Has field: ${metrics.phase2.hasField}/${metrics.totalSkills} (${metrics.phase2.percentage.toFixed(1)}%)`
    );

    if (metrics.phase2.percentage === 100) {
      console.log(chalk.green('  Status: ✅ COMPLETE'));
    } else {
      const remaining = metrics.totalSkills - metrics.phase2.hasField;
      console.log(chalk.yellow(`  Status: ⚠️  ${remaining} skills need field`));
      console.log(chalk.gray(`  Run "skill-audit fix --phase 2" to auto-add`));
    }
    console.log();

    // Phase 3
    console.log(chalk.bold('Phase 3: Line Count (Anthropic recommends <500 lines)'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(
      `  Safe (<350 lines): ${metrics.phase3.safe}/${metrics.totalSkills} (${metrics.phase3.percentage.toFixed(1)}%)`
    );
    console.log(`  Caution (350-450): ${metrics.phase3.caution}`);
    console.log(`  Warning (450-500): ${metrics.phase3.warning}`);

    if (metrics.phase3.critical > 0) {
      console.log(chalk.red(`  Over limit (>500): ${metrics.phase3.critical} ⚠️`));
      console.log(chalk.yellow('  Status: ⚠️  Needs progressive disclosure'));
    } else if (metrics.phase3.percentage >= 80) {
      console.log(chalk.green('  Status: ✅ GOOD'));
    } else {
      console.log(chalk.yellow('  Status: 🔄 IN PROGRESS'));
    }
    console.log();

    // Phase 4
    console.log(chalk.bold('Phase 4: Reference Link Health'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(
      `  Clean links: ${metrics.phase4.cleanLinks}/${metrics.totalSkills} (${metrics.phase4.percentage.toFixed(1)}%)`
    );
    console.log(`  Total broken links: ${metrics.phase4.brokenLinks}`);

    if (metrics.phase4.percentage === 100) {
      console.log(chalk.green('  Status: ✅ COMPLETE'));
    } else {
      console.log(chalk.yellow(`  Status: ⚠️  ${metrics.phase4.skillsWithBroken} skills have broken links`));
      console.log(chalk.gray('  Run "skill-audit audit --phase 4" for details'));
    }
    console.log();

    // Phase 5
    console.log(chalk.bold('Phase 5: File Organization'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(
      `  Clean organization: ${metrics.phase5.cleanOrg}/${metrics.totalSkills} (${metrics.phase5.percentage.toFixed(1)}%)`
    );
    console.log(`  Total orphaned files: ${metrics.phase5.orphanedFiles}`);

    if (metrics.phase5.percentage === 100) {
      console.log(chalk.green('  Status: ✅ COMPLETE'));
    } else {
      console.log(chalk.yellow(`  Status: ⚠️  ${metrics.phase5.skillsWithOrphans} skills have orphaned files`));
      console.log(chalk.gray('  Run "skill-audit fix --phase 5" to auto-organize'));
    }
    console.log();

    // Phase 7
    console.log(chalk.bold('Phase 7: Output Directory Pattern (Optional)'));
    console.log(chalk.gray('─'.repeat(50)));

    if (metrics.phase7.hasPattern + metrics.phase7.needsPattern === 0) {
      console.log(chalk.gray('  No skills generate runtime artifacts'));
    } else {
      const total = metrics.phase7.hasPattern + metrics.phase7.needsPattern;
      console.log(
        `  Has .local/ pattern: ${metrics.phase7.hasPattern}/${total} (${metrics.phase7.percentage.toFixed(1)}%)`
      );
      console.log(`  Loose runtime files: ${metrics.phase7.looseFiles}`);

      if (metrics.phase7.percentage === 100) {
        console.log(chalk.green('  Status: ✅ COMPLETE'));
      } else {
        console.log(chalk.blue(`  Status: ℹ️  ${metrics.phase7.needsPattern} skills could benefit from .local/`));
        console.log(chalk.gray('  Run "skill-audit fix --phase 7" to auto-organize'));
      }
    }
    console.log();

    // Overall score
    console.log(chalk.bold('Overall Compliance Score'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`  Score: ${metrics.overallScore.toFixed(1)}/100`);
    console.log();

    const rating = this.getRating(metrics.overallScore);
    console.log(`  Rating: ${rating.icon} ${rating.label}`);
    console.log();

    // Next steps
    if (metrics.overallScore < 100) {
      console.log(chalk.bold('Next Steps:'));
      console.log(chalk.gray('─'.repeat(50)));

      let step = 1;

      if (metrics.phase3.critical > 0) {
        console.log(chalk.blue(`  ${step}. Extract content from ${metrics.phase3.critical} oversized skills (>500 lines)`));
        step++;
      }

      if (metrics.phase5.percentage < 100) {
        console.log(chalk.blue(`  ${step}. Run "skill-audit fix --phase 5" to organize orphaned files`));
        step++;
      }

      if (metrics.phase4.brokenLinks > 0) {
        console.log(chalk.blue(`  ${step}. Fix ${metrics.phase4.brokenLinks} broken reference links (manual)`));
        step++;
      }

      if (metrics.phase1.percentage < 100) {
        console.log(chalk.blue(`  ${step}. Fix ${metrics.totalSkills - metrics.phase1.compliant} descriptions to start with "Use when"`));
        console.log(chalk.gray('     (Run "skill-audit audit -v" for suggestions)'));
        step++;
      }

      console.log();
    }
  }

  /**
   * Get rating based on score
   */
  private getRating(score: number): { icon: string; label: string } {
    if (score >= 90) {
      return { icon: '✅', label: chalk.green('EXCELLENT') };
    } else if (score >= 75) {
      return { icon: '✅', label: chalk.green('GOOD') };
    } else if (score >= 60) {
      return { icon: '⚠️', label: chalk.yellow('FAIR') };
    } else {
      return { icon: '❌', label: chalk.red('NEEDS WORK') };
    }
  }
}
