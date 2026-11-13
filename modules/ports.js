// Future modules: contracts only. None are advertised as implemented services.
(function(root){
root.AEFuture={
providers:{openai:{implemented:true,protocol:'Responses',images:false,video:false},anthropic:{implemented:false},gemini:{implemented:false},ollama:{implemented:false},clientConnection:{implemented:false}},
video:{implemented:false,contract:{input:['file','startSeconds','endSeconds','targetDescription'],output:['timestampedFrames','samplingReason','visualInference','measurementConfidence'],trackingExtension:['trackObjects','fitCurves','coordinateMapping']}},
capture:{implemented:false,contract:{input:['compId','times','resolution'],output:['images','actualTimes']}},
assets:{implemented:false,requiresCostConfirmation:true,outputType:'footage-not-editable-animation'},
skills:{implemented:false,contract:{required:['id','version','purpose','inputs','conditions','rules'],canExpandPermissions:false}}
};
})(this);
