#!/usr/bin/env node

// Quick test script to verify JSONL parser works with actual Claude Code logs
import { ClaudeLogParser } from './dist/parser/log-parser.js';
import path from 'path';
import os from 'os';

async function testParser() {
  console.log('🧪 Testing Claude Code JSONL Log Parser...\n');
  
  try {
    // Use the current working directory to find Claude projects path
    const workingDir = process.cwd();
    const claudeProjectsPath = ClaudeLogParser.getClaudeProjectsPath(workingDir);
    
    console.log(`Working Directory: ${workingDir}`);
    console.log(`Claude Projects Path: ${claudeProjectsPath}\n`);
    
    // Initialize parser
    const parser = new ClaudeLogParser(claudeProjectsPath);
    
    // Find latest session file
    const latestSessionFile = await ClaudeLogParser.findLatestSessionFile(claudeProjectsPath);
    console.log(`Latest Session File: ${latestSessionFile}\n`);
    
    if (!latestSessionFile) {
      console.log('❌ No JSONL session files found');
      return;
    }
    
    // Parse all sessions
    console.log('📊 Parsing all sessions...');
    const sessions = await parser.parseSessionLogs();
    
    console.log(`✅ Found ${sessions.length} sessions\n`);
    
    if (sessions.length > 0) {
      const latestSession = sessions[0];
      console.log('📋 Latest Session Info:');
      console.log(`  Session ID: ${latestSession.sessionId}`);
      console.log(`  Start Time: ${latestSession.startTime.toISOString()}`);
      console.log(`  End Time: ${latestSession.endTime.toISOString()}`);
      console.log(`  Working Directory: ${latestSession.workingDirectory}`);
      console.log(`  Total Tasks: ${latestSession.totalTasks}`);
      console.log(`  Completed Tasks: ${latestSession.completedTasks}`);
      console.log(`  Agent Activities: ${latestSession.agents.length}\n`);
      
      if (latestSession.agents.length > 0) {
        console.log('🤖 Agent Activities:');
        latestSession.agents.forEach((activity, index) => {
          console.log(`  ${index + 1}. ${activity.agentType}: ${activity.metadata?.taskDescription || activity.taskId}`);
          console.log(`     Tokens: ${activity.inputTokens} in, ${activity.outputTokens} out`);
          console.log(`     Time: ${activity.startTime.toISOString()}`);
        });
      }
    }
    
    console.log('\n✅ Parser test completed successfully!');
    
  } catch (error) {
    console.error('❌ Parser test failed:', error);
    process.exit(1);
  }
}

// Run the test
testParser();