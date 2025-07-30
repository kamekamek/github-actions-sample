#!/usr/bin/env node

// Debug script to see what's in the JSONL files
import fs from 'fs';
import path from 'path';
import os from 'os';

function debugJSONLFile(filePath) {
  console.log(`\n🔍 Debugging file: ${path.basename(filePath)}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    console.log(`📝 Total lines: ${lines.length}`);
    
    let taskToolCalls = 0;
    let assistantMessages = 0;
    let userMessages = 0;
    let systemMessages = 0;
    
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      try {
        const entry = JSON.parse(lines[i]);
        
        if (entry.type === 'assistant') assistantMessages++;
        if (entry.type === 'user') userMessages++;
        if (entry.type === 'system') systemMessages++;
        
        // Look for Task tool calls
        if (entry.type === 'assistant' && entry.message?.content) {
          for (const contentItem of entry.message.content) {
            if (contentItem.type === 'tool_use' && contentItem.name === 'Task') {
              taskToolCalls++;
              console.log(`  🤖 Found Task call: ${contentItem.input?.subagent_type || 'unknown'} - ${contentItem.input?.description || 'no description'}`);
            }
          }
        }
        
        // Show first few entries for debugging
        if (i < 3) {
          console.log(`  Entry ${i + 1}: type=${entry.type}, timestamp=${entry.timestamp}`);
          if (entry.message?.content) {
            const tools = entry.message.content.filter(c => c.type === 'tool_use').map(c => c.name);
            if (tools.length > 0) {
              console.log(`    Tools: ${tools.join(', ')}`);
            }
          }
        }
      } catch (parseError) {
        console.warn(`    ⚠️ Failed to parse line ${i + 1}`);
      }
    }
    
    console.log(`📊 Summary:`);
    console.log(`  - Assistant messages: ${assistantMessages}`);
    console.log(`  - User messages: ${userMessages}`);
    console.log(`  - System messages: ${systemMessages}`);
    console.log(`  - Task tool calls: ${taskToolCalls}`);
    
  } catch (error) {
    console.error(`❌ Error reading file: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Debugging Claude Code JSONL Files...\n');
  
  const workingDir = '/Users/kamenonagare/kameno-lab/github-actions-sample';
  const claudeProjectsPath = workingDir.replace(/\//g, '-');
  const projectDir = path.join(os.homedir(), '.claude', 'projects', claudeProjectsPath);
  
  console.log(`Working Directory: ${workingDir}`);
  console.log(`Project Directory: ${projectDir}`);
  
  try {
    if (!fs.existsSync(projectDir)) {
      console.log('❌ Project directory does not exist');
      return;
    }
    
    const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
    console.log(`📁 Found ${files.length} JSONL files`);
    
    for (const file of files.slice(0, 3)) { // Check first 3 files
      const filePath = path.join(projectDir, file);
      debugJSONLFile(filePath);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

main();