#include "../host/bootstrap.jsx"
var integrationReport = (function(){
var report={version:app.version,tests:[],error:null},c;
function check(name,condition){report.tests.push({name:name,passed:!!condition});if(!condition)throw Error(name);}
function call(r){return AEJSON.parse(AEAssistant.dispatch(AEJSON.stringify(r)));}
try{
c=app.project.items.addComp('AI 助手验收 '+(new Date().getTime()),960,540,1,5,30);
var bg=c.layers.addSolid([0.06,0.08,0.14],'背景',960,540,1,5);bg.locked=true;
var product=c.layers.addSolid([0.5,0.3,0.9],'产品',160,200,1,5);product.property('ADBE Transform Group').property('ADBE Position').setValue([480,280]);
var title=c.layers.addText('产品动画验收');title.property('ADBE Transform Group').property('ADBE Position').setValue([480,100]);
product.selected=true;title.selected=false;bg.selected=false;c.openInViewer();
var s=call({action:'inspect'});report.inspectError=s.error||null;check('真实工程读取',s.ok&&s.state.layers.length===3);s=s.state;
var op={kind:'animatePosition',layerId:product.id,property:'position',start:0,duration:1,offset:[-300,0],bounce:0.12,expression:''};
var request={action:'execute',id:'integration-a-'+c.id,revision:s.revision,targets:[product.id],overwrite:false,plan:{summary:'入场',operations:[op]}};
var r=call(request);if(!r.ok)report.execution=r;check('原生关键帧执行',r.ok);var p=product.property('ADBE Transform Group').property('ADBE Position');check('三枚可编辑关键帧',p.numKeys===3);check('保留最终构图',p.keyValue(3)[0]===480&&p.keyValue(3)[1]===280);
check('重复任务不叠加',call(request).ok&&p.numKeys===3&&c.numLayers===3);
var initial=AEJSON.stringify(r.state.layers);
s=call({action:'inspect'}).state;op.kind='revisePosition';op.duration=0.8;op.bounce=0.06;
r=call({action:'execute',id:'integration-b-'+c.id,revision:s.revision,targets:[product.id],overwrite:true,plan:{summary:'回弹减半、提前结束',operations:[op]}});check('连续修改',r.ok&&p.keyTime(3)===0.8&&Math.abs(p.keyValue(2)[0]-498)<0.001);
r=call({action:'undo'});check('撤销恢复全部关键帧',r.ok&&p.keyTime(3)===1&&Math.abs(p.keyValue(2)[0]-516)<0.001);
check('背景与标题未修改',bg.locked&&bg.property('ADBE Transform Group').property('ADBE Position').numKeys===0&&title.property('ADBE Transform Group').property('ADBE Position').numKeys===0);
s=call({action:'inspect'}).state;product.name='产品（状态变化）';r=call({action:'execute',id:'stale-'+c.id,revision:s.revision,targets:[product.id],overwrite:true,plan:{summary:'过期方案',operations:[op]}});check('拒绝过期方案',!r.ok&&r.error.indexOf('STALE_STATE')>=0);
s=call({action:'inspect'}).state;var ex={kind:'expression',layerId:product.id,property:'opacity',start:0,duration:1,offset:[0,0],bounce:0,expression:'50 + 25 * Math.sin(time)'};
r=call({action:'execute',id:'expression-'+c.id,revision:s.revision,targets:[product.id],overwrite:false,plan:{summary:'表达式',operations:[ex]}});check('表达式写入',r.ok);
s=call({action:'inspect'}).state;ex.expression='thisIsNotDefined +';r=call({action:'execute',id:'bad-expression-'+c.id,revision:s.revision,targets:[product.id],overwrite:true,plan:{summary:'无效表达式',operations:[ex]}});check('错误表达式回滚',!r.ok&&r.status==='rolled_back'&&product.property('ADBE Transform Group').property('ADBE Opacity').expression==='50 + 25 * Math.sin(time)');
report.compName=c.name;report.compId=c.id;report.layerId=product.id;
}catch(e){report.error=String(e);}return AEJSON.stringify(report);
})();

var reportFile = new File(File($.fileName).parent.parent.fsName + "/docs/ae-integration-result.json");
if (!reportFile.open("w")) throw Error("Cannot write test report");
reportFile.encoding="UTF-8";reportFile.write(integrationReport);reportFile.close();
