(function(){
'use strict';
var $=function(id){return document.getElementById(id);},state=null,targets=[],proposal=null,history=[],controller=null,busy=false,manualTargets=false,videoURL=null,gif=null,referenceLoad=0,chatgpt=null;
function status(s){$('status').textContent=s;}
function lock(v){busy=v;['generate','text-only','sample','apply','refresh','undo','video-file','clip-start','clip-end','density','object','prompt','connect-chatgpt','disconnect-chatgpt','manage-usage'].forEach(function(k){if($(k))$(k).disabled=v;});}
function initChatGPT(){try{if(!window.cep_node||typeof window.cep_node.require!=='function')throw Error('AE 面板未启用安全的本机连接组件');var nr=window.cep_node.require,p=nr('path'),file=decodeURIComponent(window.location.pathname),modulePath=p.resolve(p.dirname(file),'../runtime/chatgpt.js');chatgpt=nr(modulePath);if(!chatgpt||typeof chatgpt.signIn!=='function')throw Error('ChatGPT 本机连接组件未正确加载');}catch(e){chatgpt=null;$('chatgpt-account').textContent='本机连接组件未就绪：'+e.message;}}
function loadModels(){if(!chatgpt)return Promise.reject(Error('ChatGPT 连接组件未就绪'));return chatgpt.models().then(function(models){var select=$('model'),saved='';try{saved=localStorage.getItem('ae-assistant:model')||'';}catch(ignore){}select.textContent='';models.forEach(function(m){var option=document.createElement('option');option.value=m.id;option.textContent=m.name;select.appendChild(option);});if(saved&&models.some(function(m){return m.id===saved;}))select.value=saved;if(!models.length){var empty=document.createElement('option');empty.value='';empty.textContent='此账号没有可用模型';select.appendChild(empty);}select.disabled=!models.length;$('save').disabled=!models.length;return models;});}
function refreshChatGPT(){if(!chatgpt)return Promise.resolve();return chatgpt.getSession().then(function(session){if(session.connected){$('chatgpt-account').textContent='已连接'+(session.email?'：'+session.email:'')+' · 此账号的套餐额度用于合格请求';$('connect-chatgpt').textContent='重新连接 ChatGPT';$('disconnect-chatgpt').hidden=false;$('plan-usage').hidden=false;$('manage-usage').hidden=false;return loadModels().then(function(models){if(!models.length){status('ChatGPT 已连接，但账号当前没有可用模型。');return models;}status('ChatGPT 已连接，可开始分析参考动效。');return models;}).catch(function(error){$('chatgpt-account').textContent='ChatGPT 已连接，但模型列表读取失败：'+error.message;throw error;});} $('chatgpt-account').textContent='尚未连接 ChatGPT';$('connect-chatgpt').textContent='Continue with ChatGPT';$('disconnect-chatgpt').hidden=true;$('plan-usage').hidden=true;$('manage-usage').hidden=true;$('model').disabled=true;$('save').disabled=true;return;}).catch(function(error){$('chatgpt-account').textContent='读取 ChatGPT 连接状态失败：'+error.message;throw error;});}
function host(payload){return new Promise(function(resolve,reject){if(!window.__adobe_cep__)return reject(Error('未在 AE CEP 面板中运行，不能读取或修改工程'));var done=false;var timer=setTimeout(function(){done=true;reject(Error('AE 响应超时，执行结果未知。请检查 AE；不要自动重试。'));},30000);var encoded=JSON.stringify(JSON.stringify(payload)).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');window.__adobe_cep__.evalScript('AEAssistant.dispatch('+encoded+')',function(raw){if(done){status('收到迟到的 AE 回执；请读取工程核对结果。');return;}clearTimeout(timer);try{if(!raw||raw==='EvalScript error.')throw Error('AE 执行模块没有返回结果。请关闭并重新打开Motion Relay 面板。');var r=JSON.parse(raw);if(!r.ok){var e=Error((r.status||'AE_ERROR')+': '+r.error);e.result=r;throw e;}resolve(r);}catch(e){reject(e);}});});}
function log(role,text){history.push({role:role,text:text,time:new Date().toISOString()});renderChat();try{AESessions.save(state&&state.project,history);}catch(e){status('聊天记录保存失败：'+e.message);}}
function renderChat(){$('chat').textContent='';history.slice(-20).forEach(function(m){var d=document.createElement('div');d.className='message';d.textContent=(m.role==='user'?'你':'助手')+' · '+m.text;$('chat').appendChild(d);});}
function draw(){if(!state)return;$('target-count').textContent=targets.length?'已选 '+targets.length+' 个图层':'在 AE 选中图层，或在下方勾选。';$('comp').textContent=state.compName+' · '+state.width+'×'+state.height+' · '+state.duration+' 秒';$('state').textContent=JSON.stringify(state.layers,null,2);$('layers').textContent='';var term=$('search').value.replace(/^@/,'').toLowerCase();state.layers.filter(function(l){return (l.name+' '+l.id).toLowerCase().indexOf(term)>=0;}).forEach(function(l){var label=document.createElement('label');label.className='layer';var input=document.createElement('input');input.type='checkbox';input.checked=targets.indexOf(l.id)>=0;input.disabled=busy||l.locked;input.onchange=function(){manualTargets=true;if(input.checked)targets.push(l.id);else targets=targets.filter(function(id){return id!==l.id;});invalidate();draw();};label.appendChild(input);label.appendChild(document.createTextNode(' '+l.name+'  #'+l.id+(l.locked?' · 已锁定':'')));$('layers').appendChild(label);});}
function invalidate(){proposal=null;$('proposal').hidden=true;}
async function read(keep){var previous=state,old=state&&state.project,r=await host({action:'inspect'});state=r.state;if(old!==state.project){history=AESessions.load(state.project);renderChat();}if(!keep||!previous||old!==state.project||previous.compId!==state.compId)manualTargets=false;if(!manualTargets)targets=state.layers.filter(function(l){return l.selected&&!l.locked;}).map(function(l){return l.id;});else targets=targets.filter(function(id){return state.layers.some(function(l){return l.id===id&&!l.locked;});});draw();return state;}
function show(plan){
  AEContract.validate(plan,state,targets);
  proposal={plan:plan,revision:state.revision,targets:targets.slice(),id:'task-'+Date.now()+'-'+Math.random().toString(36).slice(2)};
  $('plan').textContent=JSON.stringify(plan,null,2);
  $('scope').textContent='合成「'+state.compName+'」';
  $('description').textContent=plan.summary;
  $('changes').textContent='';
  var overwrite=false,names={position:'位置',scale:'缩放',rotation:'旋转',opacity:'不透明度'};
  plan.operations.forEach(function(op){
    var layer=state.layers.find(function(l){return l.id===op.layerId;});
    var property=layer.properties[op.property],li=document.createElement('li');
    var conflict=property&&((property.keys&&property.keys.length)||property.expression);
    if(conflict)overwrite=true;
    li.textContent='「'+layer.name+'」· '+names[op.property];
    if(op.kind==='expression')li.textContent+=' · 修改表达式（已有关键帧保留）';
    else li.textContent+=' · '+op.start.toFixed(2)+'–'+(op.start+op.duration).toFixed(2)+' 秒 · '+(op.points?op.points.length:3)+' 个位置关键帧，保留终点';
    if(conflict)li.textContent+=' · '+(op.kind==='expression'?'此属性已有动画或表达式':'替换已有位置动画');
    $('changes').appendChild(li);
  });
  $('overwrite').checked=false;
  $('overwrite-label').hidden=!overwrite;
  $('proposal').hidden=false;
  $('proposal').scrollIntoView({block:'start'});
  status('请检查下方修改清单，再点「应用到已有图层」。');
}
function clearFrames(){$('frames').textContent='';}
$('video-file').onchange=async function(){
  invalidate();clearFrames();
  var load=++referenceLoad,video=$('video'),file=this.files[0],preview=$('gif-preview');
  if(videoURL)URL.revokeObjectURL(videoURL);
  videoURL=null;gif=null;
  preview.removeAttribute('src');preview.hidden=true;
  video.removeAttribute('src');video.load();video.hidden=true;$('video-range').hidden=true;
  if(!file)return;
  if(file.type==='image/gif'||/\.gif$/i.test(file.name)){
    status('正在读取 GIF…');
    try{
      if(file.size>50*1024*1024)throw Error('GIF 超过 50 MB，请先裁剪动图。');
      var parsed=AEGif.parse(await file.arrayBuffer());
      if(load!==referenceLoad)return;
      gif=parsed;
      videoURL=URL.createObjectURL(file);
      preview.src=videoURL;preview.hidden=false;
      $('clip-start').value=0;$('clip-end').value=gif.duration;
      $('video-range').hidden=false;
      status('已载入 GIF，一轮 '+gif.duration.toFixed(2)+' 秒。可以选择要参考的时间段。');
    }catch(error){if(load===referenceLoad)status(error.message);}
    return;
  }
  status('正在读取参考视频…');
  videoURL=URL.createObjectURL(file);video.src=videoURL;
};
$('video').onloadedmetadata=function(){
  if(!videoURL||gif||!Number.isFinite(this.duration))return;
  $('clip-start').value=0;$('clip-end').value=Math.min(4,this.duration);
  this.hidden=false;$('video-range').hidden=false;
  status('已载入视频。请选择时间段和对应图层。');
};
$('video').onerror=function(){if(videoURL&&!gif&&this.getAttribute('src'))status('AE 面板无法解码此视频。请尝试 VP8 或 VP9 编码的 WebM。');};
['clip-start','clip-end','density','object','prompt'].forEach(function(id){
  $(id).oninput=function(){invalidate();if(id==='clip-start'||id==='clip-end'||id==='density')clearFrames();};
});
function showFrames(frames){
  clearFrames();
  frames.forEach(function(frame){
    var figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');
    caption.textContent=frame.time.toFixed(3)+' 秒';image.alt=caption.textContent+' 的参考画面';image.src=frame.url;
    figure.appendChild(image);figure.appendChild(caption);$('frames').appendChild(figure);
  });
}
$('search').oninput=draw;
async function refreshProject(showTargets){
  if(busy)return;
  invalidate();
  lock(true);
  $('refresh').textContent='读取中…';
  status('正在读取 AE 当前合成…');
  try{
    var current=await read(false);
    if(showTargets){
      $('search').value='';
      $('target-section').scrollIntoView({block:'start'});
    }
    status('已读取「'+current.compName+'」，共 '+current.layers.length+' 个图层。'+
      (targets.length?'已选 '+targets.length+' 个。':current.layers.length?'请勾选要修改的图层。':'此合成没有图层。'));
  }catch(error){
    state=null;
    targets=[];
    manualTargets=false;
    $('comp').textContent='未读取到当前合成';
    $('layers').textContent='';
    $('state').textContent='';
    $('target-count').textContent='打开一个合成后再点「读取工程」。';
    status(error.message.indexOf('NO_COMP')>=0?'请在 AE 时间轴中打开一个合成，再点「读取工程」。':error.message);
  }finally{
    $('refresh').textContent='读取工程';
    lock(false);
    draw();
  }
}
$('refresh').onclick=function(){return refreshProject(true);};
$('sample').onclick=async function(){lock(true);invalidate();try{await read(true);if(targets.length!==1)throw Error('请指定一个测试图层');show({summary:'固定参数连通测试：左侧 300 像素入场，1 秒，轻微回弹。这不是模型生成结果。',operations:[{kind:'animatePosition',layerId:targets[0],property:'position',start:state.time,duration:1,offset:[-300,0],bounce:0.08,expression:''}]});}catch(e){status(e.message);}finally{lock(false);draw();}};
async function generate(reference){
  lock(true);invalidate();
  controller=new AbortController();
  $('cancel').disabled=false;
  var timer=setTimeout(function(){controller.abort();},120000);
  try{
    var prompt=$('prompt').value.trim(),object=$('object').value.trim(),frames=null;
    var video=$('video'),referenceGif=gif,times;
    if(reference){
      if(!videoURL||$('video-range').hidden)throw Error('请先选择参考视频或 GIF。');
      if(!object)throw Error('请描述参考视频里要模仿的对象。');
      times=AEVideo.sampleTimes($('clip-start').valueAsNumber,$('clip-end').valueAsNumber,(referenceGif?referenceGif.duration:video.duration),Number($('density').value));
    }else if(!prompt)throw Error('请输入动画描述。');
    status('正在读取 AE 当前合成…');
    await read(true);
    if(!targets.length)throw Error('请先在 AE 选中图层，或在面板中勾选图层。');
    if(reference&&targets.length!==1)throw Error('本版每次迁移一个参考对象。请只选择一个目标图层。');
    if(!chatgpt)throw Error('ChatGPT 连接组件尚未就绪，请重启 After Effects 后重试。');
    var chatgptSession=await chatgpt.getSession();
    if(!chatgptSession.connected){
      $('settings').open=true;
      $('settings').scrollIntoView({block:'start'});
      throw Error('请先连接 ChatGPT，并在浏览器中授权 Motion Relay 使用套餐额度。');
    }
    var config={model:$('model').value,transport:function(body,signal){if(signal)signal.addEventListener('abort',function(){chatgpt.cancelRequest();},{once:true});return chatgpt.requestResponse(body);}};
    if(!config.model)throw Error('请先连接 ChatGPT 并选择可用模型。');
    var modelState=Object.assign({},state);
    delete modelState.revision;delete modelState.project;
    if(reference){
      modelState.layers=state.layers.filter(function(l){return targets.indexOf(l.id)>=0;});
      var layer=modelState.layers[0],position=layer.properties.position;
      if(layer.parentId||layer.threeD||layer.separated||!position||position.unsupported||position.expressionEnabled){
        throw Error('请选择位置可编辑的二维图层，且没有父级、分离维度或启用的位置表达式。');
      }
      status('正在提取参考画面…');
      var progress=function(done,total){status('正在提取参考画面 '+done+' / '+total+'…');};
      frames=referenceGif?await AEGif.sample(referenceGif,times,controller.signal,progress):await AEVideo.sample(video,times,controller.signal,progress);
      showFrames(frames);
    }
    var request={prompt:prompt||'将参考对象的运动应用到指定图层，保留终点。',state:modelState,targets:targets.slice()};
    if(reference)request.reference={object:object,targetLayerId:targets[0],start:times[0],end:times[times.length-1],width:referenceGif?referenceGif.width:video.videoWidth,height:referenceGif?referenceGif.height:video.videoHeight};
    else request.history=history.slice(-12);
    log('user',reference?'参考对象：'+object+'。'+request.prompt:request.prompt);
    var model=new AEModels.OpenAIAdapter(config),result;
    status(reference?'模型正在分析 '+frames.length+' 张参考画面…':'模型正在生成方案…');
    for(var attempt=0;attempt<2;attempt++){
      if(controller.signal.aborted)throw Error('分析已取消或超时。');
      result=await model.plan(request,controller.signal,frames);
      try{
        AEContract.validate(result.plan,state,targets,true);
        if(reference&&result.plan.operations.some(function(op){return op.kind!=='motionPath';}))throw Error('参考迁移只能生成位置轨迹。');
        break;
      }catch(error){
        if(attempt===1)throw error;
        request.validationError=error.message;
        status('方案需要修正，正在重新检查…');
      }
    }
    if(controller.signal.aborted)throw Error('分析已取消或超时。');
    if(!result.plan.operations.length){log('assistant',result.plan.summary);status(result.plan.summary);return;}
    show(result.plan);log('assistant',result.plan.summary);
  }catch(error){status(error.message);}
  finally{clearTimeout(timer);controller=null;$('cancel').disabled=true;lock(false);draw();}
}
$('generate').onclick=function(){return generate(true);};
$('text-only').onclick=function(){return generate(false);};
$('cancel').onclick=function(){if(controller)controller.abort();status('已请求取消模型调用；不会撤销此前工程修改。');};
$('connect-chatgpt').onclick=async function(){if(!chatgpt){status('ChatGPT 连接组件尚未就绪，请重启 After Effects。');return;}lock(true);$('settings').open=true;status('正在打开系统浏览器连接 ChatGPT…');try{var account=await chatgpt.signIn();await refreshChatGPT();status('已连接 ChatGPT'+(account.email?'：'+account.email:'')+'。');if(account.firstSignIn&&!localStorage.getItem('ae-assistant:chatgpt-welcomed'))$('chatgpt-welcome').hidden=false;}catch(error){status(error.message||'ChatGPT 连接失败。');}finally{lock(false);}};
$('disconnect-chatgpt').onclick=async function(){if(!chatgpt)return;lock(true);status('正在撤销 ChatGPT 授权并清除本机凭据…');try{await chatgpt.signOut();$('model').textContent='';$('model').disabled=true;$('save').disabled=true;$('chatgpt-account').textContent='已断开 ChatGPT 连接';$('disconnect-chatgpt').hidden=true;$('connect-chatgpt').textContent='Continue with ChatGPT';$('plan-usage').hidden=true;$('manage-usage').hidden=true;status('已断开 ChatGPT 连接。');}catch(error){if(error.message.indexOf('本机令牌已清除')>=0){$('model').textContent='';$('model').disabled=true;$('save').disabled=true;$('connect-chatgpt').textContent='Continue with ChatGPT';$('plan-usage').hidden=true;$('manage-usage').hidden=true;$('disconnect-chatgpt').hidden=true;status(error.message);}else status('断开连接失败：'+error.message);}finally{lock(false);}};
$('manage-usage').onclick=function(){if(!chatgpt)return;chatgpt.openUsageSettings().catch(function(error){status(error.message);});};
$('welcome-dismiss').onclick=function(){localStorage.setItem('ae-assistant:chatgpt-welcomed','1');$('chatgpt-welcome').hidden=true;};
$('save').onclick=function(){try{localStorage.setItem('ae-assistant:model',$('model').value);status('已保存当前 ChatGPT 模型。');}catch(error){status('保存失败：'+error.message);}};
$('apply').onclick=async function(){if(!proposal)return;if(!$('overwrite-label').hidden&&!$('overwrite').checked){status('请先确认替换已有动画或表达式。');return;}lock(true);var p=proposal;try{status('正在 AE 中校验并执行…');var r=await host({action:'execute',id:p.id,plan:p.plan,revision:p.revision,targets:p.targets,overwrite:$('overwrite').checked});state=r.state;invalidate();draw();log('assistant','执行成功：'+p.plan.summary+'\n任务 '+p.id);status('已修改原生 AE 属性。可在时间轴编辑关键帧或撤销。');}catch(e){invalidate();log('assistant',e.message);status(e.message);try{await read(true);}catch(ignore){}}finally{lock(false);draw();}};
$('undo').onclick=async function(){lock(true);invalidate();try{var r=await host({action:'undo'});state=r.state;draw();log('assistant','已恢复上次操作修改前的属性。');status('撤销完成。');}catch(e){status(e.message);}finally{lock(false);draw();}};
initChatGPT();
refreshChatGPT().catch(function(){});
refreshProject(false);
})();
