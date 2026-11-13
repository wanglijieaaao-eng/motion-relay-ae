(function(root){
'use strict';

function waitFor(video,event,start,signal){
  return new Promise(function(resolve,reject){
    var timer=setTimeout(function(){finish(Error('视频读取超时。请尝试较短的片段或 WebM 文件。'));},7000);
    function finish(error){
      clearTimeout(timer);
      video.removeEventListener(event,ready);
      video.removeEventListener('error',failed);
      signal.removeEventListener('abort',abort);
      if(error)reject(error);else resolve();
    }
    function ready(){finish();}
    function failed(){finish(Error('当前 AE 面板无法解码此视频。请尝试 VP8 或 VP9 编码的 WebM。'));}
    function abort(){finish(Error('已取消视频分析。'));}
    if(signal.aborted){abort();return;}
    video.addEventListener(event,ready);
    video.addEventListener('error',failed);
    signal.addEventListener('abort',abort);
    try{start();}catch(error){finish(error);}
  });
}

function sampleTimes(start,end,duration,density){
  if(![start,end,duration,density].every(Number.isFinite)||start<0||end<=start||end>duration||density<=0){
    throw Error('请填写有效的视频时间段，结束时间须大于开始时间。');
  }
  var count=Math.max(6,Math.ceil((end-start)*density)+1);
  if(count>72)throw Error('当前片段会产生超过 72 帧。请缩短片段或降低采样密度。');
  return Array.from({length:count},function(_,i){return start+(end-start)*i/(count-1);});
}

async function sample(video,times,signal,progress){
  if(!video.videoWidth||!video.videoHeight)throw Error('视频尚未准备好。');
  var canvas=document.createElement('canvas');
  var scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
  canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  var context=canvas.getContext('2d'),frames=[];
  video.pause();
  for(var i=0;i<times.length;i++){
    var time=Math.min(times[i],Math.max(0,video.duration-0.001));
    if(video.readyState<2)await waitFor(video,'loadeddata',function(){},signal);
    if(Math.abs(video.currentTime-time)>0.0001||video.seeking){
      await waitFor(video,'seeked',function(){video.currentTime=time;},signal);
    }
    if(signal.aborted)throw Error('已取消视频分析。');
    context.drawImage(video,0,0,canvas.width,canvas.height);
    frames.push({time:video.currentTime,url:canvas.toDataURL('image/jpeg',0.78)});
    progress(i+1,times.length);
    await new Promise(function(resolve){setTimeout(resolve,0);});
  }
  return frames;
}

root.AEVideo={sample:sample,sampleTimes:sampleTimes};
if(typeof module!=='undefined')module.exports=root.AEVideo;
})(this);
