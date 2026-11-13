(function(root){
'use strict';

// Use Chromium's GIF image decoder for each patch. Reading the container
// ourselves lets us seek by frame delay without relying on a looping <img>.
function parse(buffer){
  var bytes=new Uint8Array(buffer),cursor=0,frames=[],durationMs=0,pixels=0;
  function take(size){
    if(cursor+size>bytes.length)throw Error('GIF 文件不完整或已损坏。');
    var part=bytes.subarray(cursor,cursor+size);
    cursor+=size;
    return part;
  }
  function byte(){return take(1)[0];}
  function word(part,index){return part[index]+part[index+1]*256;}
  function skipBlocks(){var count;while((count=byte())!==0)take(count);}

  var header=take(6);
  if(!/^GIF8[79]a$/.test(String.fromCharCode.apply(null,header)))throw Error('文件不是有效的 GIF。');
  var screen=take(7),width=word(screen,0),height=word(screen,2);
  if(!width||!height||width*height>16777216)throw Error('GIF 画面尺寸过大或无效。');
  var palette=take(screen[4]&128?3*(2<<(screen[4]&7)):0);
  var background=palette.length>screen[5]*3+2?palette.subarray(screen[5]*3,screen[5]*3+3):null;
  var control=null,complete=false;
  while(cursor<bytes.length){
    var marker=byte();
    if(marker===59){complete=true;break;}
    if(marker===33){
      var label=byte();
      if(label===249){
        if(byte()!==4)throw Error('GIF 帧控制块无效。');
        control=take(4);
        if(byte()!==0)throw Error('GIF 帧控制块无效。');
      }else{
        skipBlocks();
        if(label===1)control=null;
      }
      continue;
    }
    if(marker!==44)throw Error('GIF 包含无效的数据块。');
    var descriptor=take(9),x=word(descriptor,0),y=word(descriptor,2);
    var w=word(descriptor,4),h=word(descriptor,6);
    if(!w||!h||x+w>width||y+h>height)throw Error('GIF 帧超出画面范围。');
    pixels+=w*h;
    if(frames.length>=2000||pixels>250000000)throw Error('GIF 帧过多或分辨率过高，请先裁剪动图。');
    var dataStart=cursor;
    if(descriptor[8]&128)take(3*(2<<(descriptor[8]&7)));
    var codeSize=byte();
    if(codeSize<2||codeSize>8)throw Error('GIF 图像数据无效。');
    skipBlocks();

    var delayMs=control?word(control,1)*10:0;
    // Chromium plays GIF delays below 20 ms at 100 ms.
    if(delayMs<20)delayMs=100;
    frames.push({
      x:x,y:y,width:w,height:h,start:durationMs/1000,
      disposal:control?(control[0]>>2)&7:0,
      transparent:!!(control&&(control[0]&1)),
      descriptor:descriptor,control:control,data:bytes.subarray(dataStart,cursor)
    });
    durationMs+=delayMs;
    control=null;
  }
  if(!complete||!frames.length)throw Error('GIF 文件不完整或没有可读帧。');
  return {width:width,height:height,duration:durationMs/1000,frames:frames,header:header,screen:screen,palette:palette,background:background};
}

function patchBlob(gif,frame){
  var screen=new Uint8Array(gif.screen),descriptor=new Uint8Array(frame.descriptor);
  screen.set(descriptor.subarray(4,8));
  descriptor.fill(0,0,4);
  var parts=[gif.header,screen,gif.palette];
  if(frame.transparent)parts.push(new Uint8Array([33,249,4,1,0,0,frame.control[3],0]));
  parts.push(new Uint8Array([44]),descriptor,frame.data,new Uint8Array([59]));
  return new Blob(parts,{type:'image/gif'});
}

function decodePatch(gif,frame,signal){
  return new Promise(function(resolve,reject){
    if(signal.aborted){reject(Error('已取消 GIF 分析。'));return;}
    var image=new Image(),url=URL.createObjectURL(patchBlob(gif,frame));
    function finish(error){
      image.onload=image.onerror=null;
      signal.removeEventListener('abort',abort);
      URL.revokeObjectURL(url);
      if(error)reject(error);else resolve(image);
    }
    function abort(){finish(Error('已取消 GIF 分析。'));}
    signal.addEventListener('abort',abort);
    image.onload=function(){finish();};
    image.onerror=function(){finish(Error('GIF 帧解码失败。'));};
    image.src=url;
  });
}

async function sample(gif,times,signal,progress){
  var composite=document.createElement('canvas'),preview=document.createElement('canvas');
  composite.width=gif.width;composite.height=gif.height;
  var scale=Math.min(1,640/Math.max(gif.width,gif.height));
  preview.width=Math.max(1,Math.round(gif.width*scale));
  preview.height=Math.max(1,Math.round(gif.height*scale));
  var ctx=composite.getContext('2d'),out=preview.getContext('2d');
  if(!ctx||!out)throw Error('无法创建 GIF 抽帧画布。');
  function background(frame,x,y,w,h){
    ctx.clearRect(x,y,w,h);
    if(!frame.transparent&&gif.background){
      ctx.fillStyle='rgb('+Array.from(gif.background).join(',')+')';
      ctx.fillRect(x,y,w,h);
    }
  }
  background(gif.frames[0],0,0,gif.width,gif.height);
  var samples=[],next=0;
  for(var i=0;i<gif.frames.length&&next<times.length;i++){
    var frame=gif.frames[i],following=gif.frames[i+1];
    var restore=frame.disposal===3?ctx.getImageData(frame.x,frame.y,frame.width,frame.height):null;
    var image=await decodePatch(gif,frame,signal);
    if(signal.aborted)throw Error('已取消 GIF 分析。');
    ctx.drawImage(image,frame.x,frame.y);
    if(!following||times[next]<following.start){
      out.fillStyle='#000';out.fillRect(0,0,preview.width,preview.height);
      out.drawImage(composite,0,0,preview.width,preview.height);
      var url=preview.toDataURL('image/jpeg',0.78);
      while(next<times.length&&(!following||times[next]<following.start)){
        samples.push({time:times[next],url:url});
        next++;
        progress(next,times.length);
      }
    }
    if(frame.disposal===2)background(frame,frame.x,frame.y,frame.width,frame.height);
    if(restore)ctx.putImageData(restore,frame.x,frame.y);
  }
  return samples;
}

root.AEGif={parse:parse,sample:sample};
if(typeof module!=='undefined')module.exports=root.AEGif;
})(this);
