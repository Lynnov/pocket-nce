import { copyFile,mkdir,stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const source=process.argv[2];
if(!source){console.error('用法: node scripts/prepare-audio.mjs "G:\\课程文件\\第2册美音"');process.exit(1);}
const destination=fileURLToPath(new URL('../app/audio/',import.meta.url));
const names=['01－A Private Conversation.mp3','02－Breakfast or Lunch.mp3','03－Please Send Me a Card.mp3'];
for(const name of names){const info=await stat(path.join(source,name));if(!info.isFile()||info.size<1000)throw new Error(`音频不可用: ${name}`);}
await mkdir(destination,{recursive:true});
for(let i=0;i<names.length;i++){const target=path.join(destination,`lesson-${i+1}.mp3`);await copyFile(path.join(source,names[i]),target);console.log(`已准备 lesson-${i+1}.mp3`);}
