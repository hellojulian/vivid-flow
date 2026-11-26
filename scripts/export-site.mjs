import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {parse} from '@babel/parser';

const SOURCE='https://decisive-adapts-589437.framer.app/';
const TARGET='https://hellojulian.github.io/vivid-flow/';
const BASE='/vivid-flow/';
const OUTPUT=path.resolve('site');
const assets=new Map();
const allowedHosts=new Set(['framerusercontent.com','fonts.gstatic.com']);
const assetExt=/\.(?:m?js|css|json|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|mp4|webm|mov|glb|gltf|bin)(?:$|\?)/i;
const textExt=/\.(?:m?js|css|json|svg)$/i;
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&#38;','&');
function register(value,base=SOURCE){
  if(value.includes('${')||value.includes('\\'))return;
  let url;try{url=new URL(decode(value),base);}catch{return;}
  if(!allowedHosts.has(url.hostname)||!assetExt.test(url.pathname+url.search))return;
  url.hash='';const key=url.href;
  if(!assets.has(key)){
    const ext=path.posix.extname(url.pathname);
    const query=url.search?'-'+crypto.createHash('sha256').update(url.search).digest('hex').slice(0,10):'';
    const local='assets/'+url.hostname+url.pathname.slice(0,ext?-ext.length:undefined)+query+ext;
    assets.set(key,{url:key,local,status:'pending'});
  }
  return assets.get(key);
}
function discover(text,base){
  for(const match of text.matchAll(/https:\/\/(?:framerusercontent\.com|fonts\.gstatic\.com)\/[^\s"'`<>\)\\]+/g))register(match[0],base);
  if(/\.m?js(?:\?|$)/.test(base)){
    for(const match of text.matchAll(/(["'`])((?:\.\.?\/)[^"'`\s]+\.(?:m?js|css|json)(?:\?[^"'`\s]*)?)\1/g))register(match[2],base);
  }
}
function patchMain(text){
  const changes=[];
  const walk=node=>{
    if(!node||typeof node!=='object')return;
    if(node.type==='ObjectProperty'){
      const key=node.key.name||node.key.value;
      if(key==='EditorBar')changes.push([node.value.start,node.value.end,'void 0']);
      if(node.value.type==='TemplateLiteral'&&node.value.quasis.length===1&&node.value.quasis[0].value.cooked==='testimonials')changes.push([node.value.start,node.value.end,JSON.stringify('pricing-1')]);
      if(key==='siteCanonicalURL')changes.push([node.value.start,node.value.end,JSON.stringify(new URL(TARGET).origin)]);
      if(key==='path'&&node.value.type==='TemplateLiteral'&&node.value.quasis.length===1){
        const value=node.value.quasis[0].value.cooked;
        if(value==='/'||value==='/404')changes.push([node.value.start,node.value.end,JSON.stringify(value==='/'?BASE:BASE+'404')]);
      }
    }
    if(node.type==='CallExpression'&&node.callee.type==='FunctionExpression'&&text.slice(node.callee.start,node.callee.end).includes('__framer-badge-container')){
      changes.push([node.start,node.end,'void 0']);return;
    }
    for(const [key,value]of Object.entries(node)){
      if(['loc','start','end','extra','comments','tokens'].includes(key))continue;
      if(Array.isArray(value))for(const child of value)walk(child);else if(value&&typeof value==='object')walk(value);
    }
  };
  walk(parse(text,{sourceType:'module'}));
  if(!changes.some(([, ,replacement])=>replacement==='void 0'))throw new Error('Expected platform bootstrap was not found; review the new export.');
  for(const [start,end,replacement]of changes.sort((a,b)=>b[0]-a[0]))text=text.slice(0,start)+replacement+text.slice(end);
  return text;
}
async function fetchOK(url){
  let failure;
  for(let attempt=0;attempt<3;attempt++){
    try{const r=await fetch(url,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(`HTTP ${r.status}: ${url}`);return r;}catch(e){failure=e;if(attempt<2)await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
  }
  throw failure;
}
fs.mkdirSync(OUTPUT,{recursive:true});
let html=await(await fetchOK(SOURCE)).text();
const sourceHash=crypto.createHash('sha256').update(html).digest('hex');
const publishedAt=html.match(/<!-- Published (.*?) -->/)?.[1]||null;
// Keep the published layout and application runtime, excluding host-only telemetry/editor bootstrap.
html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,tag=>/events\.framer\.com|__framer_force_showing_editorbar_since/.test(tag)?'':tag);
html=html.replace(/<link\b[^>]*rel="preconnect"[^>]*>/gi,'');
html=html.replace(/<meta\b[^>]*name="framer-search-index(?:-fallback)?"[^>]*>/gi,'');
html=html.replace(/<!-- Made in Framer[^>]*-->/g,'');
html=html.replace(/<title>[^<]*<\/title>/,'<title>Vivid Flow — AI Creative Workflows for Mac</title>');
html=html.replaceAll('Dream Motion - AI Image and Video Generator','Vivid Flow — AI Creative Workflows for Mac');
html=html.replaceAll('Create AI images and videos for campaigns, product stories, ads, and social content with Dream Motion.','Explore images, video, and 3D concepts in Vivid Flow. A visual AI creative workspace for Mac.');
html=html.replaceAll(SOURCE,TARGET);
discover(html,SOURCE);
let downloaded=0;
while(true){
  const batch=[...assets.values()].filter(a=>a.status==='pending').slice(0,6);
  if(!batch.length)break;
  await Promise.all(batch.map(async asset=>{
    asset.status='loading';const response=await fetchOK(asset.url);const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>95*1024*1024)throw new Error('Asset exceeds repository file limit: '+asset.url);
    asset.bytes=bytes.length;
    if(textExt.test(new URL(asset.url).pathname)){
      let text=bytes.toString('utf8');
      if(new URL(asset.url).pathname.includes('/script_main.'))text=patchMain(text);
      asset.text=text;discover(text,asset.url);
    }else asset.binary=bytes;
    asset.status='ready';downloaded++;
  }));
  console.log(`Downloaded ${downloaded} assets; ${[...assets.values()].filter(a=>a.status==='pending').length} queued`);
  if(assets.size>400)throw new Error('Unexpected asset graph size; review dependencies.');
}
function rewrite(text){
  // Longer strings first, so a base URL cannot consume a queried variant.
  for(const asset of [...assets.values()].sort((a,b)=>b.url.length-a.url.length)){
    const local=BASE+asset.local;
    text=text.split(asset.url.replaceAll('&','&amp;')).join(local);
    text=text.split(asset.url).join(local);
  }
  return text;
}
for(const asset of assets.values()){
  const file=path.join(OUTPUT,asset.local);fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,asset.text!==undefined?rewrite(asset.text):asset.binary);
}
html=rewrite(html);
const entry=[...assets.values()].find(asset=>new URL(asset.url).pathname.includes('/script_main.'));
if(entry){
  const revision=crypto.createHash('sha256').update(rewrite(entry.text)).digest('hex').slice(0,12);
  html=html.replaceAll(BASE+entry.local,BASE+entry.local+'?v='+revision);
}
// No host badge is mounted: the copied site's bootstrap no longer starts it.
function removeBadgeElement(document){
  const start=document.indexOf('<div id="__framer-badge-container"');
  if(start<0)return document;
  const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start;let depth=0;
  for(let match; (match=tags.exec(document));){
    depth+=match[0].startsWith('</')?-1:1;
    if(depth===0)return document.slice(0,start)+document.slice(tags.lastIndex);
  }
  throw new Error('Unclosed badge container');
}
html=removeBadgeElement(html);
html=html.replaceAll('#testimonials','#pricing-1');
html=html.replace('</head>','<link rel="stylesheet" href="/vivid-flow/hosting.css"><style>html{scroll-padding-top:100px}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}}</style></head>');
fs.writeFileSync(path.join(OUTPUT,'index.html'),html);
fs.writeFileSync(path.join(OUTPUT,'.nojekyll'),'');
fs.writeFileSync(path.join(OUTPUT,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+TARGET+'sitemap.xml\n');
fs.writeFileSync(path.join(OUTPUT,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+TARGET+'</loc></url></urlset>\n');
fs.writeFileSync(path.join(OUTPUT,'404.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Vivid Flow</title><style>body{background:#0a0a0a;color:#fff;font:20px system-ui;padding:15vh 10vw}a{color:#7cd9ff}</style><h1>Page not found</h1><p>Find your way back to Vivid Flow.</p><a href="'+BASE+'">Back to the website</a></html>');
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/export.json',JSON.stringify({source:SOURCE,target:TARGET,exportedAt:new Date().toISOString(),sourcePublishedAt:publishedAt,sourceHtmlSha256:sourceHash,assets:[...assets.values()].map(({url,local,bytes})=>({url,local,bytes})),hostBadgeBootstrapRemoved:true,hostEditorAndAnalyticsBootstrapRemoved:true},null,2)+'\n');
console.log('Export complete:',assets.size,'assets; source published',publishedAt);
