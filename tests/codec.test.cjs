const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(__dirname+'/../host/codec.jsx','utf8'),ctx);
for(const v of [null,true,false,42,-2.3e5,'中文\n"\\\t',[1,'a'],{a:[{b:'产品'}]}])test('JSON round trip '+JSON.stringify(v),()=>{const text=JSON.stringify(v);assert.equal(vm.runInContext('AEJSON.stringify(AEJSON.parse('+JSON.stringify(text)+'))',ctx),text);});
for(const text of ['{"x":1};alert(1)','[1,]','{"x":undefined}','{"__proto__":{}}','"\\x20"','01'])test('拒绝恶意或无效 JSON '+text,()=>assert.throws(()=>ctx.AEJSON.parse(text)));
