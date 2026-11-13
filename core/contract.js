/* Shared ES5 validation: browser, Node tests and ExtendScript. */
(function(root){
var props={position:'ADBE Position',scale:'ADBE Scale',rotation:'ADBE Rotate Z',opacity:'ADBE Opacity'};
function fail(s){throw new Error(s);}
function number(n,min,max,label){if(typeof n!=='number'||!isFinite(n)||n<min||n>max)fail(label+' 超出范围');}
function exact(o,fields){if(!o||typeof o!=='object'||o instanceof Array)fail('需要对象');for(var k in o)if(Object.prototype.hasOwnProperty.call(o,k)&&fields.indexOf(k)<0)fail('未知字段 '+k);for(var i=0;i<fields.length;i++)if(!Object.prototype.hasOwnProperty.call(o,fields[i]))fail('缺少 '+fields[i]);}
function validate(plan,state,targets,allowEmpty){
exact(plan,['summary','operations']);if(typeof plan.summary!=='string'||plan.summary.length>2000)fail('说明无效');
if(allowEmpty&&plan.operations instanceof Array&&plan.operations.length===0)return plan;
if(!(plan.operations instanceof Array)||plan.operations.length<1||plan.operations.length>20)fail('每次需 1–20 个操作');
var seen={};
for(var i=0;i<plan.operations.length;i++){
var o=plan.operations[i];var fields=['kind','layerId','property','start','duration','offset','bounce','expression'];
if(o && o.kind==='motionPath')fields.push('points');
exact(o,fields);
if(['animatePosition','revisePosition','expression','motionPath'].indexOf(o.kind)<0)fail('不支持的操作');
number(o.layerId,1,2147483647,'图层 ID');if(targets.indexOf(o.layerId)<0)fail('目标未授权');
var l=null;for(var j=0;j<state.layers.length;j++)if(state.layers[j].id===o.layerId)l=state.layers[j];
if(!l)fail('图层已不存在');if(l.locked)fail('图层已锁定');if(!props[o.property])fail('属性不支持');
var k=o.layerId+':'+o.property;if(seen[k])fail('同一属性不能重复操作');seen[k]=true;
number(o.start,0,state.duration,'开始时间');number(o.duration,0.04,Math.min(60,state.duration),'持续时间');if(o.start+o.duration>state.duration+0.00001)fail('超出合成时间');
if(!(o.offset instanceof Array)||o.offset.length!==2)fail('偏移必须是二维向量');number(o.offset[0],-20000,20000,'X');number(o.offset[1],-20000,20000,'Y');number(o.bounce,0,0.5,'回弹');
if(typeof o.expression!=='string'||o.expression.length>8000)fail('表达式过长');
if(o.kind!=='expression'){
if(o.property!=='position'||o.expression!=='')fail('动画仅支持 position');
if(l.threeD||l.parentId||l.separated)fail('第一阶段仅支持无父级的二维非分离位置图层');
if(!l.properties.position||l.properties.position.unsupported)fail('此图层的位置属性不可用');
if(l.properties.position.expressionEnabled)fail('请先处理现有位置表达式');
if(o.kind==='motionPath'){
if(o.start<l.inPoint-0.00001||o.start+o.duration>l.outPoint+0.00001)fail('轨迹超出目标图层的可见时间');
var points=o.points;
if(!(points instanceof Array)||points.length<2||points.length>32)fail('轨迹需包含 2–32 个点');
for(var q=0;q<points.length;q++){
var point=points[q];exact(point,['t','x','y']);
number(point.t,0,1,'轨迹时间');number(point.x,-20000,20000,'轨迹 X');number(point.y,-20000,20000,'轨迹 Y');
if(q&&point.t-points[q-1].t<0.0001)fail('轨迹时间必须按顺序且不重复');
}
var end=points[points.length-1];
if(points[0].t!==0||end.t!==1||end.x!==0||end.y!==0)fail('轨迹必须覆盖完整时长并保留终点');
}
if(o.kind==='revisePosition'&&(!l.recipe||l.recipe.points))fail('没有可继续修改的本助手动画');
}
}
return plan;
}
var op={type:'object',additionalProperties:false,properties:{kind:{type:'string','enum':['animatePosition','revisePosition','expression']},layerId:{type:'integer'},property:{type:'string','enum':['position','scale','rotation','opacity']},start:{type:'number'},duration:{type:'number'},offset:{type:'array',items:{type:'number'},minItems:2,maxItems:2},bounce:{type:'number'},expression:{type:'string'}},required:['kind','layerId','property','start','duration','offset','bounce','expression']};
var pathProperties={};
for(var field in op.properties)if(op.properties.hasOwnProperty(field))pathProperties[field]=op.properties[field];
pathProperties.kind={type:'string','enum':['motionPath']};
pathProperties.points={type:'array',minItems:2,maxItems:32,items:{type:'object',additionalProperties:false,properties:{t:{type:'number'},x:{type:'number'},y:{type:'number'}},required:['t','x','y']}};
var pathOp={type:'object',additionalProperties:false,properties:pathProperties,required:op.required.concat(['points'])};
var api={validate:validate,props:props,schema:{type:'object',additionalProperties:false,properties:{summary:{type:'string'},operations:{type:'array',items:{anyOf:[op,pathOp]},minItems:0,maxItems:20}},required:['summary','operations']}};
root.AEContract=api;if(typeof module!=='undefined')module.exports=api;
})(this);
