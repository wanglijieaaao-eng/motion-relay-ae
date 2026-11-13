(function(root){
  'use strict';
  function b64url(bytes){return Buffer.from(bytes).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
  function createChallenge(crypto){
    var verifier=b64url(crypto.randomBytes(32));
    var challenge=b64url(crypto.createHash('sha256').update(verifier).digest());
    return {verifier:verifier,challenge:challenge};
  }
  function createAuthorizationUrl(options){
    if(!options||!options.redirectUri||!options.state||!options.nonce||!options.codeChallenge||!options.hostId)throw new Error('授权参数不完整');
    var url=new URL('https://auth.openai.com/api/accounts/authorize');
    url.searchParams.set('client_id',options.clientId||'dynamic_agent_client');
    url.searchParams.set('response_type','code');
    url.searchParams.set('redirect_uri',options.redirectUri);
    url.searchParams.set('scope','openid profile email offline_access resource.invoke chatgpt.tokens.use.direct');
    url.searchParams.set('resource','https://api.openai.com/v1');
    url.searchParams.set('state',options.state);
    url.searchParams.set('nonce',options.nonce);
    url.searchParams.set('code_challenge_method','S256');
    url.searchParams.set('code_challenge',options.codeChallenge);
    if(options.prompt)url.searchParams.set('prompt',options.prompt);
    if(options.clientId){if(options.idTokenHint)url.searchParams.set('id_token_hint',options.idTokenHint);if(options.email)url.searchParams.set('login_hint',options.email);}
    else url.searchParams.set('agent_name_hint',options.appName);
    url.searchParams.set('ext_agent_host_id',options.hostId);
    return url.toString();
  }
  function validateCallback(query,expected){
    if(!query||!expected||query.state!==expected.state)throw new Error('ChatGPT 登录回调状态不匹配');
    if(query.error)throw new Error(query.error==='access_denied'?'你取消了 ChatGPT 授权':'ChatGPT 授权失败：'+String(query.error).slice(0,100));
    if(typeof query.code!=='string'||!query.code)throw new Error('ChatGPT 登录没有返回授权码');
    var clientId=expected.clientId||query.client_id;
    if(!clientId)throw new Error('未收到 ChatGPT 客户端标识');
    if(expected.clientId&&query.client_id&&query.client_id!==expected.clientId)throw new Error('ChatGPT 返回的客户端标识与已保存账户不符');
    return {code:query.code,clientId:clientId};
  }
  function validateIdentityClaims(payload,clientId,nonce,now){
    now=now||Math.floor(Date.now()/1000);
    var aud=payload&&payload.aud,hasAudience=aud===clientId||(Array.isArray(aud)&&aud.indexOf(clientId)>=0);
    if(!payload||payload.iss!=='https://auth.openai.com'||!hasAudience||(Array.isArray(aud)&&aud.length>1&&payload.azp!==clientId)||!payload.sub||payload.nonce!==nonce||!payload.exp||payload.exp<=now||(payload.nbf&&payload.nbf>now))throw new Error('ChatGPT 身份令牌未通过发行方、账户、随机数或有效期校验');
    return payload;
  }
  var api={createChallenge:createChallenge,createAuthorizationUrl:createAuthorizationUrl,validateCallback:validateCallback,validateIdentityClaims:validateIdentityClaims};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.AEChatGPTAuth=api;
})(this);
