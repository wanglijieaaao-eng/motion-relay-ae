(function(root){
var prefix='ae-assistant:v1:';
root.AESessions={load:function(project){if(!project)return [];try{var a=JSON.parse(localStorage.getItem(prefix+project)||'[]');return Array.isArray(a)?a.slice(-80):[];}catch(e){return [];}},save:function(project,entries){if(project)localStorage.setItem(prefix+project,JSON.stringify(entries.slice(-80)));}};
})(this);
