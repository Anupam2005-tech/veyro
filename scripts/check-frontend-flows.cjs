// Local synthetic preview only: build with NEXT_PUBLIC_VEYRO_DEMO_MODE=true and serve on 127.0.0.1:3100.
let activeSocket;
const assert=require('node:assert/strict');
(async()=>{
 const list=await(await fetch('http://127.0.0.1:9223/json/list')).json();const ws=activeSocket=new WebSocket(list.find(p=>p.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.addEventListener('open',r,{once:true}));let seq=0;const pending=new Map();
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}});
 const send=(method,params={})=>{ if(method==='Input.dispatchKeyEvent'){const code={Tab:9,Escape:27,ArrowDown:40,Enter:13}[params.key];params={...params,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,...(params.key==='Enter'&&params.type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})};}return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});};
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async expression=>{for(let i=0;i<30;i++){const v=await evaluate(expression);if(v)return v;await wait(200)}throw Error('Timed out: '+expression)};
 await send('Page.enable');await send('Runtime.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin==='http://127.0.0.1:3100'){const uid='flow-customer';localStorage.setItem('veyro:demo:user',JSON.stringify({uid,email:'fixture@veyro.demo',displayName:'Synthetic Reviewer'}));localStorage.setItem('veyro:demo:profile:'+uid,JSON.stringify({uid,role:'CUSTOMER',fullName:'Synthetic Reviewer',phone:'+919876543210',onboardingComplete:true,updatedAt:new Date().toISOString()}));sessionStorage.setItem('veyro:role-intent','customer');}`});
 await send('Page.navigate',{url:'http://127.0.0.1:3100/customer/bookings'});
 await until(`[...document.querySelectorAll('button')].some(e=>/^Cancel/.test(e.textContent.trim()))`);
 await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>/^Cancel/.test(e.textContent.trim()));window.__returnFocus=b;b.focus();b.click()})()`);
 await until(`!!document.querySelector('[role=dialog]')`);
 for(let i=0;i<8;i++){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab'});assert.equal(await evaluate(`!!document.activeElement.closest('[role=dialog]')`),true)}
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});await wait(250);
 const focus=await evaluate(`({closed:!document.querySelector('[role=dialog]'),returned:document.activeElement===window.__returnFocus})`);assert.equal(focus.closed,true);assert.equal(focus.returned,true);console.log('Dialog Escape, focus trap and focus return passed');
 await send('Page.navigate',{url:'http://127.0.0.1:3100/customer'});await until(`!!document.querySelector('#booking-destination')`);await wait(600);
 await evaluate(`document.querySelector('#booking-destination').focus()`);await send('Input.insertText',{text:'Koramangala'});
 await until(`!!document.querySelector('#booking-destination-suggestions button')`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown'});
 assert.equal(await evaluate(`document.activeElement.getAttribute('role')`),'option');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter'});
 await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Find drivers')&&!b.disabled)`);
 console.log('Autocomplete keyboard selection and route preview passed');
 await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Find drivers')).click()`);
 await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Get Fare Quote')&&!b.disabled)`);
 await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Get Fare Quote')).click()`);
 await until(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Confirm Chauffeur Booking'))`);
 await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Confirm Chauffeur Booking')).click()`);
 await until(`location.pathname==='/customer/bookings'&&location.search.includes('created=')`);
 console.log('Synthetic instant driver search, quote and booking confirmation passed');
 ws.close();
})().catch(e=>{console.error(e);activeSocket?.close();process.exitCode=1});
