// Local synthetic preview only: build with NEXT_PUBLIC_VEYRO_DEMO_MODE=true and serve on 127.0.0.1:3100.
let activeSocket;
const fs = require('node:fs');
fs.mkdirSync('/tmp/veyro-frontend-browser-review', { recursive: true });
(async () => {
 const pages = await (await fetch('http://127.0.0.1:9223/json/list')).json();
 const ws = activeSocket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
 await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
 let seq = 0; const pending = new Map(), runtime = [], results = [];
 ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); } }
  if (m.method === 'Runtime.exceptionThrown') runtime.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
 });
 const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
 const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
 await send('Page.enable'); await send('Runtime.enable');
 await send('Page.addScriptToEvaluateOnNewDocument', { source: `if(location.origin==='http://127.0.0.1:3100'){
  const p=location.pathname, role=p.includes('/driver')?'DRIVER':p.startsWith('/admin')?'ADMIN':'CUSTOMER';
  const uid='browser-'+role.toLowerCase();
  const noUser=p==='/'||p.startsWith('/auth')||p.startsWith('/legal')||p==='/design-system';
  if(noUser)localStorage.removeItem('veyro:demo:user');else{
   localStorage.setItem('veyro:demo:user',JSON.stringify({uid,email:'fixture@veyro.demo',phoneNumber:'+919876543210',displayName:'Synthetic Frontend Reviewer'}));
   localStorage.setItem('veyro:demo:profile:'+uid,JSON.stringify({uid,role,fullName:'Synthetic Frontend Reviewer',phone:'+919876543210',onboardingComplete:!p.startsWith('/onboarding'),applicationStatus:'APPROVED',updatedAt:new Date().toISOString()}));
   sessionStorage.setItem('veyro:role-intent',role==='DRIVER'?'driver':'customer');
  }
 }` });
 const routes = ['/', '/auth', '/auth/driver', '/auth/admin', '/onboarding/customer', '/onboarding/driver', '/customer', '/customer/bookings', '/customer/profile',
 '/customer/trips/VEY-DEMO-2041', '/customer/trips/VEY-DEMO-1987/summary', '/driver?role=driver', '/driver/status?role=driver', '/driver/profile?role=driver',
 '/driver/earnings?role=driver', '/driver/trips/VEY-DEMO-2041?role=driver', '/admin?role=admin', '/admin/applications?role=admin', '/admin/applications/APP-2041?role=admin',
 '/admin/reports?role=admin', '/admin/customers?role=admin', '/admin/customers/CUST-2041?role=admin', '/design-system', '/legal/privacy'];
 for (const width of [768,320,390,1440]) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const route of routes) {
   console.log('CHECK '+width+' '+route);
   const before = runtime.length;
   await send('Page.navigate', { url: 'http://127.0.0.1:3100' + route });
   await new Promise(resolve => setTimeout(resolve, 1200));
   const state = await evaluate(`({path:location.pathname,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),alerts:[...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent),unnamedButtons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().width&&!(e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent.trim())).map(e=>e.outerHTML.slice(0,200))})`);
   const errors = runtime.slice(before);
   const result={route,width,...state,errors};results.push(result);
   if(state.scrollWidth>width+1||errors.length||state.unnamedButtons.length)console.log(JSON.stringify(result));
   if(width===320&&['/customer','/customer/profile','/admin?role=admin','/driver?role=driver','/'].includes(route)){
    const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync('/tmp/veyro-frontend-browser-review/'+(route.split('?')[0].replaceAll('/','-')||'landing')+'-final-320.png',Buffer.from(image.data,'base64'));
   }
  }
 }
 fs.writeFileSync('/tmp/veyro-frontend-browser-review/results-final.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify({checks:results.length,runtimeErrors:runtime.length,overflowChecks:results.filter(r=>r.scrollWidth>r.width+1).length,unnamedButtonChecks:results.filter(r=>r.unnamedButtons.length).length}));
 const failures=results.filter(r=>r.scrollWidth>r.width+1||r.errors.length||r.unnamedButtons.length||r.path!==r.route.split('?')[0]);
 if(failures.length)throw Error(failures.length+' browser checks failed; see results-final.json');
 ws.close();
})().catch(e=>{console.error(e);activeSocket?.close();process.exitCode=1});
