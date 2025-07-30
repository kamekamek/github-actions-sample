#!/usr/bin/env node

// Test with a specific file that contains Task tool calls
import { ClaudeLogParser } from './dist/parser/log-parser.js';

async function testSpecificFile() {
  console.log('🧪 Testing specific JSONL file with Task calls...\n');
  
  try {
    // Test with the file that contains the deep-researcher task
    const specificFile = '/Users/kamenonagare/.claude/projects/-Users-kamenonagare-kameno-lab-github-actions-sample/a5396c9f-eb6a-4f7a-bc5c-56f06958a195.jsonl';
    
    console.log(`Testing file: ${specificFile}\n`);
    
    // Create parser and test parsing a single file
    const parser = new ClaudeLogParser();
    
    // Since parseJSONLFile is private, I'll test with parseSessionLogs which finds all files
    const sessions = await parser.parseSessionLogs();
    
    console.log(`✅ Found ${sessions.length} sessions total\n`);
    
    // Find the session that matches our test file
    const targetSession = sessions.find(s => s.metadata?.sourceFile === specificFile);
    
    if (targetSession) {
      console.log('🎯 Found target session with agent activities:');
      console.log(`  Session ID: ${targetSession.sessionId}`);
      console.log(`  Start Time: ${targetSession.startTime.toISOString()}`);
      console.log(`  Total Tasks: ${targetSession.totalTasks}`);
      console.log(`  Agent Activities: ${targetSession.agents.length}\n`);
      
      if (targetSession.agents.length > 0) {
        console.log('🤖 Agent Activities Found:');
        targetSession.agents.forEach((activity, index) => {
          console.log(`  ${index + 1}. Agent: ${activity.agentType}`);
          console.log(`     Task ID: ${activity.taskId}`);
          console.log(`     Description: ${activity.metadata?.taskDescription || 'No description'}`);
          console.log(`     Tokens: ${activity.inputTokens} in, ${activity.outputTokens} out`);
          console.log(`     Model: ${activity.metadata?.model || 'Unknown'}`);
          console.log(`     Time: ${activity.startTime.toISOString()}\n`);
        });
      }
    } else {
      console.log('❌ Target session not found in parsed results');
      
      // Debug: show which files were parsed
      console.log('📁 Parsed sessions from files:');
      sessions.forEach(s => {
        console.log(`  - ${s.sessionId}: ${s.metadata?.sourceFile}`);
      });
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testSpecificFile();