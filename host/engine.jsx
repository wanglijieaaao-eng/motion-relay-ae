var AEAssistant = (function(){
var recipes={}, receipts={}, last=null;
function projectKey(){return app.project.file?app.project.file.fsName:null;}
function comp(){var c=app.project.activeItem;if(!(c instanceof CompItem))throw Error('NO_COMP: 请激活一个合成');return c;}
function layer(c,id){for(var i=1;i<=c.numLayers;i++)if(c.layer(i).id===id)return c.layer(i);throw Error('MISSING_LAYER: 图层不存在');}
function prop(l,name){var p=l.property('ADBE Transform Group').property(AEContract.props[name]);if(!p)throw Error('UNSUPPORTED_PROPERTY: 属性不可用');return p;}
function ease(a){var r=[];for(var i=0;i<a.length;i++)r.push({speed:a[i].speed,influence:a[i].influence});return r;}
function snapshot(p){if(p.numKeys>500)throw Error('LIMIT: 单属性超过 500 关键帧，第一阶段拒绝处理');var s={value:p.value,baseValue:p.valueAtTime(0,true),expression:p.canSetExpression?p.expression:'',expressionEnabled:p.canSetExpression?p.expressionEnabled:false,keys:[]};for(var i=1;i<=p.numKeys;i++){var k={time:p.keyTime(i),value:p.keyValue(i),inType:Number(p.keyInInterpolationType(i)),outType:Number(p.keyOutInterpolationType(i)),inEase:ease(p.keyInTemporalEase(i)),outEase:ease(p.keyOutTemporalEase(i)),temporalAuto:p.keyTemporalAutoBezier(i),temporalContinuous:p.keyTemporalContinuous(i)};if(p.isSpatial){k.inTangent=p.keyInSpatialTangent(i);k.outTangent=p.keyOutSpatialTangent(i);k.spatialAuto=p.keySpatialAutoBezier(i);k.spatialContinuous=p.keySpatialContinuous(i);k.roving=p.keyRoving(i);}s.keys.push(k);}return s;}
function signature(p){
var s=snapshot(p);
// Values sampled at the playhead change during playback even when the keys do not.
delete s.value;
if(s.keys.length)delete s.baseValue;
return AEJSON.stringify(s);
}
function recipeKey(c,l){return String(projectKey())+':'+c.id+':'+l.id;}
function inspect(){var c=comp(),a=[];if(c.numLayers>300)throw Error('LIMIT: 合成超过 300 图层，第一阶段拒绝扫描');for(var i=1;i<=c.numLayers;i++){var l=c.layer(i),ps={},name;for(name in AEContract.props){try{ps[name]=snapshot(prop(l,name));ps[name].error=prop(l,name).expressionError||'';}catch(e){ps[name]={unsupported:true,expressionEnabled:false};}}
var rec=recipes[recipeKey(c,l)];if(rec&&rec.signature!==signature(prop(l,'position')))rec=null;
var bounds=null;try{var b=l.sourceRectAtTime(c.time,false);bounds={left:b.left,top:b.top,width:b.width,height:b.height};}catch(e){}
var effects=[];try{var eg=l.property('ADBE Effect Parade');for(var j=1;j<=eg.numProperties;j++)effects.push({name:eg.property(j).name,matchName:eg.property(j).matchName});}catch(e){}
a.push({id:l.id,name:l.name,index:l.index,selected:l.selected,locked:l.locked,threeD:!!l.threeDLayer,parentId:l.parent?l.parent.id:null,separated:!!prop(l,'position').dimensionsSeparated,inPoint:l.inPoint,outPoint:l.outPoint,startTime:l.startTime,width:l.width||0,height:l.height||0,anchorPoint:propAnchor(l),bounds:bounds,effects:effects,type:layerType(l),properties:ps,recipe:rec?rec.recipe:null});}
var s={project:projectKey(),compId:c.id,compName:c.name,width:c.width,height:c.height,duration:c.duration,time:c.time,frameRate:c.frameRate,layers:a};s.revision=AEJSON.stringify(s);return s;}
function layerType(l){if(l instanceof TextLayer)return 'text';if(l instanceof ShapeLayer)return 'shape';if(l.nullLayer)return 'null';return 'av';}
function propAnchor(l){try{return l.property('ADBE Transform Group').property('ADBE Anchor Point').value;}catch(e){return null;}}
function clear(p){if(p.canSetExpression)p.expression='';for(var k=p.numKeys;k>=1;k--)p.removeKey(k);}
function makeEase(a){var r=[];for(var i=0;i<a.length;i++)r.push(new KeyframeEase(a[i].speed,a[i].influence));return r;}
function restore(p,s){clear(p);if(!s.keys.length)p.setValue(s.baseValue);for(var i=0;i<s.keys.length;i++)p.setValueAtTime(s.keys[i].time,s.keys[i].value);for(i=0;i<s.keys.length;i++){var k=s.keys[i],n=i+1;p.setInterpolationTypeAtKey(n,k.inType,k.outType);p.setTemporalEaseAtKey(n,makeEase(k.inEase),makeEase(k.outEase));p.setTemporalContinuousAtKey(n,k.temporalContinuous);p.setTemporalAutoBezierAtKey(n,k.temporalAuto);if(p.isSpatial){p.setSpatialContinuousAtKey(n,k.spatialContinuous);p.setSpatialTangentsAtKey(n,k.inTangent,k.outTangent);p.setSpatialAutoBezierAtKey(n,k.spatialAuto);if(n>1&&n<s.keys.length)p.setRovingAtKey(n,k.roving);}}if(p.canSetExpression){p.expression=s.expression;p.expressionEnabled=s.expressionEnabled;}}
function animate(p,o,end){clear(p);var times=[o.start,o.start+o.duration*0.72,o.start+o.duration],values=[[end[0]+o.offset[0],end[1]+o.offset[1]],[end[0]-o.offset[0]*o.bounce,end[1]-o.offset[1]*o.bounce],end];var tangent=[0,0];if(end.length===3){values[0].push(end[2]);values[1].push(end[2]);tangent.push(0);}for(var i=0;i<3;i++){p.setValueAtTime(times[i],values[i]);var n=p.nearestKeyIndex(times[i]);p.setInterpolationTypeAtKey(n,KeyframeInterpolationType.BEZIER,KeyframeInterpolationType.BEZIER);p.setTemporalEaseAtKey(n,[new KeyframeEase(0,65)],[new KeyframeEase(0,65)]);p.setSpatialAutoBezierAtKey(n,false);p.setSpatialTangentsAtKey(n,tangent,tangent);}}
function writePath(p,o,end){
clear(p);
for(var i=0;i<o.points.length;i++){
var point=o.points[i],value=[end[0]+point.x,end[1]+point.y];
if(end.length===3)value.push(end[2]);
p.setValueAtTime(o.start+o.duration*point.t,value);
}
if(p.numKeys!==o.points.length)throw Error('PATH_TIMES: 轨迹点过于密集');
for(i=1;i<=p.numKeys;i++)p.setInterpolationTypeAtKey(i,KeyframeInterpolationType.LINEAR,KeyframeInterpolationType.LINEAR);
}
function execute(r){if(typeof r.id!=='string'||!/^task-|^integration-|^expression-|^bad-expression-|^stale-/.test(r.id)||r.id.length>100)throw Error('BAD_ID');if(receipts[r.id])return receipts[r.id];
var s=inspect(),c=comp();if(s.revision!==r.revision)throw Error('STALE_STATE: 工程已变化，请重新生成方案');AEContract.validate(r.plan,s,r.targets);
var changes=[],i;for(i=0;i<r.plan.operations.length;i++){var o=r.plan.operations[i],l=layer(c,o.layerId),p=prop(l,o.property);if(o.kind==='expression'&&!p.canSetExpression)throw Error('EXPRESSION_UNSUPPORTED');if((p.numKeys||p.expression)&&!r.overwrite)throw Error('CONFLICT: 需明确确认覆盖已有关键帧或表达式');changes.push({id:l.id,property:o.property,before:snapshot(p),recipeBefore:recipes[recipeKey(c,l)]||null});}
var result;app.beginUndoGroup('Motion Relay');try{
for(i=0;i<r.plan.operations.length;i++){o=r.plan.operations[i];l=layer(c,o.layerId);p=prop(l,o.property);if(o.kind==='expression'){p.expression=o.expression;p.expressionEnabled=!!o.expression;if(o.expression){p.valueAtTime(c.time,false);if(p.expressionError)throw Error('EXPRESSION_ERROR: '+p.expressionError);}}else{var rec=recipes[recipeKey(c,l)],end;
if(o.kind==='revisePosition'||(o.kind==='motionPath'&&rec&&rec.signature===signature(p)))end=rec.recipe.end;
else end=p.valueAtTime(o.start+o.duration,true);
if(o.kind==='motionPath')writePath(p,o,end);else animate(p,o,end);
recipes[recipeKey(c,l)]={recipe:{start:o.start,duration:o.duration,offset:o.offset,bounce:o.bounce,end:end,points:o.points||null},signature:signature(p)};}changes[i].after=signature(p);}
last={project:projectKey(),compId:c.id,changes:changes};result={ok:true,id:r.id,status:'applied',state:inspect()};receipts[r.id]=result;
}catch(e){var failures=[];for(i=changes.length-1;i>=0;i--){try{l=layer(c,changes[i].id);restore(prop(l,changes[i].property),changes[i].before);recipes[recipeKey(c,l)]=changes[i].recipeBefore;}catch(re){failures.push(String(re));}}result={ok:false,id:r.id,status:failures.length?'partial':'rolled_back',error:String(e),recoveryErrors:failures};receipts[r.id]=result;last=null;
}finally{app.endUndoGroup();}return result;}
function undo(){if(!last)throw Error('NO_UNDO: 本次面板会话没有可撤销操作');var c=comp(),i;if(projectKey()!==last.project||c.id!==last.compId)throw Error('WRONG_PROJECT');for(i=0;i<last.changes.length;i++){var x=last.changes[i],l=layer(c,x.id);if(l.locked||signature(prop(l,x.property))!==x.after)throw Error('UNDO_CONFLICT: 目标已被另行修改，请使用 AE 原生撤销记录');}app.beginUndoGroup('撤销 Motion Relay 修改');try{for(i=last.changes.length-1;i>=0;i--){x=last.changes[i];l=layer(c,x.id);restore(prop(l,x.property),x.before);recipes[recipeKey(c,l)]=x.recipeBefore;}last=null;}finally{app.endUndoGroup();}return {ok:true,status:'undone',state:inspect()};}
function dispatch(raw){try{var r=AEJSON.parse(raw);if(r.action==='inspect')return AEJSON.stringify({ok:true,state:inspect()});if(r.action==='execute')return AEJSON.stringify(execute(r));if(r.action==='undo')return AEJSON.stringify(undo());throw Error('UNKNOWN_ACTION');}catch(e){return AEJSON.stringify({ok:false,status:'rejected',error:String(e)});}}
return {dispatch:dispatch};
})();
