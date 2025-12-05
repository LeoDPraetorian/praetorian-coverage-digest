/**
 * Debug script to test agent parsing
 */

import { findAgent, findAllAgents, getAgentStats } from './lib/agent-finder.js';

const agentName = process.argv[2] || 'react-developer';

console.log(`\n=== Debugging agent: ${agentName} ===\n`);

const agent = findAgent(agentName);

if (agent) {
  console.log('File:', agent.filePath);
  console.log('Category:', agent.category);
  console.log('Name:', agent.frontmatter.name);
  console.log('Description Status:', agent.descriptionStatus);
  console.log('Description Length:', agent.frontmatter.description?.length || 0);
  console.log('Description Preview:', agent.frontmatter.description?.substring(0, 150) || '(empty)');
  console.log('\nRaw Frontmatter Preview:');
  console.log(agent.rawFrontmatter?.substring(0, 300) || '(empty)');
  console.log('\nMetrics:');
  console.log('  Line Count:', agent.lineCount);
  console.log('  Body Line Count:', agent.bodyLineCount);
  console.log('  Has Use When Trigger:', agent.hasUseWhenTrigger);
  console.log('  Has Examples:', agent.hasExamples);
  console.log('  Has Gateway Skill:', agent.hasGatewaySkill);
  console.log('  Has Output Format:', agent.hasOutputFormat);
  console.log('  Has Escalation Protocol:', agent.hasEscalationProtocol);
} else {
  console.log('Agent not found!');
}

console.log('\n=== Stats ===\n');
const stats = getAgentStats();
console.log('Total agents:', stats.total);
console.log('Valid:', stats.byStatus.valid);
console.log('Broken:', stats.byStatus.broken);
console.log('By category:', stats.byCategory);
