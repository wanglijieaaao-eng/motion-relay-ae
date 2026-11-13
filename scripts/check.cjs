const fs=require('node:fs'),vm=require('node:vm');
for(const path of ['core/contract.js','core/model.js','core/session.js','core/chatgpt-auth.js','panel/app.js','panel/video.js','panel/gif.js','runtime/chatgpt.js','host/codec.jsx','host/engine.jsx']){new vm.Script(fs.readFileSync(path,'utf8'),{filename:path});console.log('Syntax OK '+path);}
const xml=fs.readFileSync('CSXS/manifest.xml','utf8');if(!xml.includes('Version="[24.0,24.9]"'))throw Error('Host version range changed');
