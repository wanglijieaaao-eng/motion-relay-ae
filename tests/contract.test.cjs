const test=require('node:test'),assert=require('node:assert/strict');
const {validate}=require('../core/contract');
const state={duration:10,layers:[{id:42,locked:false,threeD:false,parentId:null,separated:false,properties:{position:{expressionEnabled:false}},recipe:null}]};
function plan(){return {summary:'入场',operations:[{kind:'animatePosition',layerId:42,property:'position',start:0,duration:1,offset:[-300,0],bounce:0.1,expression:''}]};}
function run(mutator,pattern){const p=plan(),s=JSON.parse(JSON.stringify(state));mutator(p,s);assert.throws(()=>validate(p,s,[42]),pattern);}
test('接受约束内的现有图层动画',()=>assert.equal(validate(plan(),state,[42]).operations.length,1));
test('拒绝越权图层',()=>run(p=>p.operations[0].layerId=43,/未授权/));
test('拒绝额外脚本字段',()=>run(p=>p.operations[0].script='app.project.close()' ,/未知字段/));
test('拒绝锁定图层',()=>run((p,s)=>s.layers[0].locked=true,/锁定/));
test('拒绝非有限参数',()=>run(p=>p.operations[0].duration=NaN,/范围/));
test('拒绝超出合成时间',()=>run(p=>p.operations[0].start=9.8,/超出合成/));
test('拒绝重复属性操作',()=>run(p=>p.operations.push({...p.operations[0]}),/重复/));
test('父级坐标不可静默当作合成坐标',()=>run((p,s)=>s.layers[0].parentId=10,/无父级/));
test('3D 和分离位置明确不支持',()=>{run((p,s)=>s.layers[0].threeD=true,/二维/);run((p,s)=>s.layers[0].separated=true,/非分离/);});
test('不覆盖启用的位置表达式',()=>run((p,s)=>s.layers[0].properties.position.expressionEnabled=true,/表达式/));
test('连续修改必须有已验证的配方',()=>run(p=>p.operations[0].kind='revisePosition',/没有可继续/));
test('表达式可以明确指向透明度',()=>{const p=plan();Object.assign(p.operations[0],{kind:'expression',property:'opacity',expression:'50+50*Math.sin(time)'});validate(p,state,[42]);});

test('解释回复可为空操作，执行端仍拒绝空写入',()=>{const p={summary:'表达式说明',operations:[]};validate(p,state,[42],true);assert.throws(()=>validate(p,state,[42]),/1–20/);});
