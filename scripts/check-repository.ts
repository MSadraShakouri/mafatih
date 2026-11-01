import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isGeneratedRepositoryPath} from '../src/repository-policy.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const top=spawnSync('git',['-C',root,'rev-parse','--show-toplevel'],{encoding:'utf8'});
if(top.status!==0||path.resolve(top.stdout.trim())!==root){
  console.log('Repository artifact check skipped: project is not the root of a Git worktree.');
  process.exit(0);
}
const result=spawnSync('git',['-C',root,'ls-files','--cached','-z'],{encoding:'utf8'});
if(result.status!==0)throw new Error('Could not inspect tracked files: '+result.stderr);
const forbidden=result.stdout.split('\0').filter(Boolean).filter(isGeneratedRepositoryPath);
if(forbidden.length){
  console.error('Generated artifacts or backups are tracked. Remove them from the Git index and regenerate when needed:');
  for(const file of forbidden)console.error('  '+file);
  process.exit(1);
}
console.log('Repository artifact check passed: no tracked indexes, build outputs, databases or archives.');
