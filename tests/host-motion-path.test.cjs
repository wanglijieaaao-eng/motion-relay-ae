const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const contract=require('../core/contract');

function mockProperty(value){
  const p={value:value.slice(),base:value.slice(),keys:[],canSetExpression:true,expression:'',expressionEnabled:false,expressionError:'',dimensionsSeparated:false,isSpatial:true};
  Object.defineProperty(p,'numKeys',{get(){return p.keys.length;}});
  p.valueAtTime=function(t){let prior=null,next=null;for(const k of p.keys){if(k.time<=t)prior=k;if(k.time>=t){next=k;break;}}if(!prior)return p.base.slice();if(!next||next.time===prior.time)return prior.value.slice();const q=(t-prior.time)/(next.time-prior.time);return prior.value.map((v,i)=>v+(next.value[i]-v)*q);};
  p.setValue=function(v){p.base=v.slice();p.value=v.slice();};
  p.setValueAtTime=function(time,v){p.keys=p.keys.filter(k=>k.time!==time);p.keys.push({time,value:v.slice(),inType:0,outType:0,inEase:[{speed:0,influence:33}],outEase:[{speed:0,influence:33}],temporalAuto:false,temporalContinuous:false,inTangent:[0,0],outTangent:[0,0],spatialAuto:false,spatialContinuous:false,roving:false});p.keys.sort((a,b)=>a.time-b.time);};
  p.removeKey=function(index){p.keys.splice(index-1,1);};
  p.keyTime=i=>p.keys[i-1].time;p.keyValue=i=>p.keys[i-1].value.slice();
  p.keyInInterpolationType=i=>p.keys[i-1].inType;p.keyOutInterpolationType=i=>p.keys[i-1].outType;
  p.keyInTemporalEase=i=>p.keys[i-1].inEase;p.keyOutTemporalEase=i=>p.keys[i-1].outEase;
  p.keyTemporalAutoBezier=i=>p.keys[i-1].temporalAuto;p.keyTemporalContinuous=i=>p.keys[i-1].temporalContinuous;
  p.keyInSpatialTangent=i=>p.keys[i-1].inTangent;p.keyOutSpatialTangent=i=>p.keys[i-1].outTangent;
  p.keySpatialAutoBezier=i=>p.keys[i-1].spatialAuto;p.keySpatialContinuous=i=>p.keys[i-1].spatialContinuous;p.keyRoving=i=>p.keys[i-1].roving;
  p.nearestKeyIndex=function(t){return p.keys.findIndex(k=>k.time===t)+1;};
  p.setInterpolationTypeAtKey=(i,a,b)=>{p.keys[i-1].inType=a;p.keys[i-1].outType=b;};
  p.setTemporalEaseAtKey=(i,a,b)=>{p.keys[i-1].inEase=a;p.keys[i-1].outEase=b;};
  p.setTemporalContinuousAtKey=(i,v)=>{p.keys[i-1].temporalContinuous=v;};
  p.setTemporalAutoBezierAtKey=(i,v)=>{p.keys[i-1].temporalAuto=v;};
  p.setSpatialAutoBezierAtKey=(i,v)=>{p.keys[i-1].spatialAuto=v;};
  p.setSpatialTangentsAtKey=(i,a,b)=>{p.keys[i-1].inTangent=a;p.keys[i-1].outTangent=b;};
  p.setSpatialContinuousAtKey=(i,v)=>{p.keys[i-1].spatialContinuous=v;};p.setRovingAtKey=(i,v)=>{p.keys[i-1].roving=v;};
  return p;
}

function harness(){
  const position=mockProperty([960,540]);
  const transforms={position,scale:mockProperty([100,100]),rotation:mockProperty([0]),opacity:mockProperty([100])};
  const layer={id:13,name:'产品',index:1,selected:true,locked:false,threeDLayer:false,parent:null,dimensionsSeparated:false,inPoint:0,outPoint:5,startTime:0,width:400,height:300,nullLayer:false,
    property(name){if(name==='ADBE Transform Group')return {property(key){return transforms[{ 'ADBE Position':'position','ADBE Scale':'scale','ADBE Rotate Z':'rotation','ADBE Opacity':'opacity','ADBE Anchor Point':'anchor'}[key]]|| (key==='anchor'?{value:[200,150]}:null);}};if(name==='ADBE Effect Parade')return {numProperties:0};return null;},
    sourceRectAtTime(){return {left:0,top:0,width:400,height:300};}};
  function TextLayer(){} function ShapeLayer(){} function CompItem(){}
  const comp=Object.assign(Object.create(CompItem.prototype),{id:77,name:'产品动画',width:1920,height:1080,duration:5,time:0,frameRate:30,numLayers:1,layer(i){return i===1?layer:null;}});
  const app={project:{file:{fsName:'/tmp/motion-relay-test.aep'},activeItem:comp},beginUndoGroup(){},endUndoGroup(){}};
  const context=vm.createContext({app,CompItem,TextLayer,ShapeLayer,AEContract:contract,AEJSON:JSON,KeyframeEase:function(speed,influence){this.speed=speed;this.influence=influence;},KeyframeInterpolationType:{BEZIER:1,LINEAR:2}});
  vm.runInContext(fs.readFileSync(__dirname+'/../host/engine.jsx','utf8'),context);
  return {dispatch:context.AEAssistant.dispatch,layer,position,comp};
}

test('参考轨迹写成目标图层的可编辑关键帧，末点保留原位置且撤销可恢复',()=>{
  const h=harness();
  const inspected=JSON.parse(h.dispatch(JSON.stringify({action:'inspect'})));
  const op={kind:'motionPath',layerId:13,property:'position',start:1,duration:1,offset:[0,0],bounce:0,expression:'',points:[{t:0,x:-240,y:120},{t:0.45,x:32,y:-90},{t:1,x:0,y:0}]};
  const plan={summary:'参考产品弧线入场',operations:[op]};
  const result=JSON.parse(h.dispatch(JSON.stringify({action:'execute',id:'task-reference-1',plan,revision:inspected.state.revision,targets:[13],overwrite:false})));
  assert.equal(result.ok,true);
  assert.equal(h.comp.numLayers,1,'迁移不应新建素材或图层');
  assert.equal(h.position.numKeys,3);
  assert.deepEqual(Array.from(h.position.keyValue(1)),[720,660]);
  assert.deepEqual(Array.from(h.position.keyValue(2)),[992,450]);
  assert.deepEqual(Array.from(h.position.keyValue(3)),[960,540],'最后一个关键帧保持原构图位置');
  assert.equal(h.position.keys.every(k=>k.spatialAuto&&k.spatialContinuous),true,'轨迹关键帧应使用 AE 空间自动贝塞尔以减少折线感');
  const duplicate=JSON.parse(h.dispatch(JSON.stringify({action:'execute',id:'task-reference-1',plan,revision:inspected.state.revision,targets:[13],overwrite:false})));
  assert.equal(duplicate.ok,true);
  assert.equal(h.position.numKeys,3,'重复回执不能叠加关键帧');
  const undone=JSON.parse(h.dispatch(JSON.stringify({action:'undo'})));
  assert.equal(undone.ok,true);
  assert.equal(h.position.numKeys,0);
  assert.deepEqual(Array.from(h.position.base),[960,540]);
});
