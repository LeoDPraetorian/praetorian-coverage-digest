import { getIssue } from '../linear/get-issue.js';
import { listIssues } from '../linear/list-issues.js';

async function main() {
  console.log('=== LINEAR TOOLS TEST ===');
  try {
    const issue = await getIssue.execute({ id: 'CHARIOT-1732' });
    console.log('✅ get-issue:', issue.identifier, '-', issue.title?.slice(0,40));
  } catch (e: any) {
    console.log('❌ get-issue:', e.message?.slice(0,80));
  }
  
  try {
    const issues = await listIssues.execute({ limit: 2 });
    console.log('✅ list-issues:', issues.totalIssues, 'issues');
  } catch (e: any) {
    console.log('❌ list-issues:', e.message?.slice(0,80));
  }
}
main();
