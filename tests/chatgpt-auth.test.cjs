const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const auth=require('../core/chatgpt-auth.js');

test('ChatGPT OAuth uses PKCE S256 and does not require an API secret',()=>{
  const pair=auth.createChallenge(crypto);
  assert.match(pair.verifier,/^[A-Za-z0-9_-]{40,50}$/);
  assert.equal(pair.challenge,crypto.createHash('sha256').update(pair.verifier).digest('base64url'));
  const url=new URL(auth.createAuthorizationUrl({redirectUri:'http://127.0.0.1:12345/auth/callback',state:'state1',nonce:'nonce1',codeChallenge:pair.challenge,hostId:'urn:uuid:1234',appName:'Motion Relay'}));
  assert.equal(url.origin,'https://auth.openai.com');
  assert.equal(url.searchParams.get('client_id'),'dynamic_agent_client');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.get('ext_agent_host_id'),'urn:uuid:1234');
  assert.equal(url.searchParams.has('client_secret'),false);
  assert.equal(url.searchParams.has('api_key'),false);
  const retry=new URL(auth.createAuthorizationUrl({redirectUri:'http://127.0.0.1:12345/auth/callback',state:'state1',nonce:'nonce1',codeChallenge:pair.challenge,hostId:'urn:uuid:1234',clientId:'oaiapp_1',prompt:'consent'}));
  assert.equal(retry.searchParams.get('client_id'),'oaiapp_1');
  assert.equal(retry.searchParams.get('prompt'),'consent');
});

test('ChatGPT first registration callback must supply issued client ID',()=>{
  assert.throws(()=>auth.validateCallback({state:'ok',code:'code'},{state:'ok'}),/客户端标识/);
  assert.deepEqual(auth.validateCallback({state:'ok',code:'code',client_id:'oaiapp_1'},{state:'ok'}),{code:'code',clientId:'oaiapp_1'});
});

test('ChatGPT callback rejects state mismatch, denial, and wrong saved client',()=>{
  assert.throws(()=>auth.validateCallback({state:'other',code:'x',client_id:'oaiapp_1'},{state:'ok'}),/状态不匹配/);
  assert.throws(()=>auth.validateCallback({state:'ok',error:'access_denied'},{state:'ok'}),/取消/);
  assert.throws(()=>auth.validateCallback({state:'ok',code:'x',client_id:'oaiapp_2'},{state:'ok',clientId:'oaiapp_1'}),/不符/);
});

test('ChatGPT ID Token claims require issuer, audience, nonce and live expiry',()=>{
  const claims={iss:'https://auth.openai.com',aud:'oaiapp_1',sub:'user-1',nonce:'nonce-1',exp:2000,nbf:1000};
  assert.equal(auth.validateIdentityClaims(claims,'oaiapp_1','nonce-1',1500),claims);
  assert.throws(()=>auth.validateIdentityClaims({...claims,iss:'https://other.example'},'oaiapp_1','nonce-1',1500),/发行方/);
  assert.throws(()=>auth.validateIdentityClaims({...claims,aud:['oaiapp_1','other'],azp:'other'},'oaiapp_1','nonce-1',1500),/发行方/);
  assert.throws(()=>auth.validateIdentityClaims({...claims,nonce:'wrong'},'oaiapp_1','nonce-1',1500),/发行方/);
  assert.throws(()=>auth.validateIdentityClaims({...claims,exp:1499},'oaiapp_1','nonce-1',1500),/发行方/);
});
