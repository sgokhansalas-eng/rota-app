const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 10000;
const points = new Map();
const TTL_MS = 5 * 60 * 1000;

function json(res, code, data) {
  res.writeHead(code, {
    'content-type':'application/json; charset=utf-8',
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,OPTIONS',
    'access-control-allow-headers':'content-type'
  });
  res.end(JSON.stringify(data));
}
function clean(){
  const now=Date.now();
  for(const [k,v] of points){ if(now-v.ts>TTL_MS) points.delete(k); }
}
setInterval(clean, 60000).unref();

http.createServer((req,res)=>{
  if(req.method==='OPTIONS') return json(res,204,{});
  const u = new URL(req.url, 'http://localhost');
  if(u.pathname==='/health') return json(res,200,{ok:true});

  if(u.pathname==='/track' && req.method==='POST'){
    let body='';
    req.on('data',c=>body+=c);
    req.on('end',()=>{
      try{
        const x=JSON.parse(body||'{}');
        const tripId=String(x.tripId||'').trim();
        const lat=Number(x.lat), lng=Number(x.lng);
        if(!tripId || !Number.isFinite(lat) || !Number.isFinite(lng)) return json(res,400,{error:'invalid'});
        points.set(tripId,{lat,lng,accuracy:Number(x.accuracy)||null,ts:Date.now()});
        return json(res,200,{ok:true});
      }catch(e){ return json(res,400,{error:'invalid_json'}); }
    });
    return;
  }

  if(u.pathname==='/track' && req.method==='GET'){
    const tripId=String(u.searchParams.get('tripId')||'').trim();
    const p=points.get(tripId);
    if(!p || Date.now()-p.ts>TTL_MS) return json(res,404,{error:'not_found'});
    return json(res,200,{...p,ageMs:Date.now()-p.ts});
  }
  return json(res,404,{error:'not_found'});
}).listen(PORT,()=>console.log('ROTA tracking listening on',PORT));
