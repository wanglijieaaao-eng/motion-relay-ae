const test=require('node:test');
const assert=require('node:assert/strict');
const {validate}=require('../core/contract');
const {sampleTimes}=require('../panel/video');

const state={duration:5,layers:[{id:7,inPoint:0.5,outPoint:4,properties:{position:{}},locked:false}]};
const points=[{t:0,x:-100,y:40},{t:0.7,x:12,y:-4},{t:1,x:0,y:0}];
const operation={kind:'motionPath',layerId:7,property:'position',start:1,duration:1,offset:[0,0],bounce:0,expression:'',points};
const plan=(changes)=>({summary:'弧线回弹',operations:[{...operation,...changes}]});

test('长片段及快速运动可采样超过六帧，时间覆盖完整区间',()=>{
  assert.equal(sampleTimes(2,4,5,3).length,7);
  assert.equal(sampleTimes(2,4,5,12).length,25);
  assert.equal(sampleTimes(2,4,5,12).at(-1),4);
  assert.throws(()=>sampleTimes(2,6,5,3),/时间段/);
});
test('迁移只接受映射图层与合法时间，终点偏移固定为零',()=>{
  assert.doesNotThrow(()=>validate(plan({}),state,[7]));
  assert.throws(()=>validate(plan({}),state,[8]),/未授权/);
  assert.throws(()=>validate(plan({start:3.5}),state,[7]),/可见时间/);
  assert.throws(()=>validate(plan({points:[points[0],{t:1,x:10,y:0}]}),state,[7]),/保留终点/);
  assert.throws(()=>validate(plan({points:[points[0],{t:0,x:10,y:0},points[2]]}),state,[7]),/按顺序/);
});
