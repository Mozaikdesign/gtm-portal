/* Mozaik GTM — usage analytics (identity + tracking + Usage panel) */
(function(){
  "use strict";
  var WORKER = "https://fragrant-flower-a132.balamir.workers.dev";
  var TEAM = ["Burçin","Zeynep","Biricik","Artun","İrem","Elif","Beliz","Balamir"];

  function track(event, detail){
    try{
      var u = localStorage.getItem("gtmUser") || "unknown";
      var body = JSON.stringify({user:u, event:event, detail:(detail||"")});
      if(navigator.sendBeacon){
        navigator.sendBeacon(WORKER+"/analytics", new Blob([body],{type:"text/plain"}));
      } else {
        fetch(WORKER+"/analytics",{method:"POST",headers:{"Content-Type":"text/plain"},body:body,keepalive:true});
      }
    }catch(e){}
  }

  function ensureUser(cb){
    var u = localStorage.getItem("gtmUser");
    if(u){ cb(u); return; }
    var ov = document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(16,17,20,.75);display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Sans',system-ui,sans-serif";
    var box=document.createElement("div");
    box.style.cssText="background:#fff;border-radius:16px;padding:28px 32px;max-width:440px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.3)";
    box.innerHTML='<div style="font-weight:700;font-size:18px;margin-bottom:6px">Who are you?</div><div style="color:#686b82;font-size:13px;margin-bottom:16px">Pick your name so the dashboard can track activity. One time only.</div>';
    var wrap=document.createElement("div");
    wrap.style.cssText="display:flex;flex-wrap:wrap;gap:8px;justify-content:center";
    TEAM.forEach(function(n){
      var b=document.createElement("button");
      b.textContent=n;
      b.style.cssText="padding:8px 14px;border:1px solid #dedee5;border-radius:10px;background:#fafafb;cursor:pointer;font-size:14px";
      b.onclick=function(){ localStorage.setItem("gtmUser",n); document.body.removeChild(ov); cb(n); };
      wrap.appendChild(b);
    });
    box.appendChild(wrap); ov.appendChild(box); document.body.appendChild(ov);
  }

  function fmtAgo(ts){
    if(!ts) return "—";
    var s=(Date.now()-ts)/1000;
    if(s<60) return Math.round(s)+"s ago";
    if(s<3600) return Math.round(s/60)+"m ago";
    if(s<86400) return Math.round(s/3600)+"h ago";
    return Math.round(s/86400)+"d ago";
  }
  function esc(s){ return String(s==null?"":s).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c];}); }

  function openUsage(){
    track("tab_view","Usage");
    var ov=document.createElement("div");
    ov.style.cssText="position:fixed;inset:0;z-index:99998;background:rgba(16,17,20,.6);overflow:auto;font-family:'IBM Plex Sans',system-ui,sans-serif";
    var box=document.createElement("div");
    box.style.cssText="background:#f3f2f7;max-width:1040px;margin:32px auto;border-radius:16px;padding:24px";
    box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><div style="font-weight:700;font-size:20px">Usage Analytics</div><button id="gtmUsageClose" style="border:1px solid #dedee5;background:#fff;border-radius:10px;padding:6px 12px;cursor:pointer">Close ✕</button></div><div id="gtmUsageBody" style="color:#686b82">Loading…</div>';
    ov.appendChild(box); document.body.appendChild(ov);
    document.getElementById("gtmUsageClose").onclick=function(){ document.body.removeChild(ov); };
    fetch(WORKER+"/analytics/report",{cache:"no-store"}).then(function(r){return r.json();}).then(function(d){
      var rows=(d.byUser||[]), WEEK=7*86400*1000, now=Date.now();
      var html='<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;font-size:13px">';
      html+='<tr style="text-align:left;color:#101114;font-weight:700;border-bottom:1px solid #dedee5"><th style="padding:10px">Person</th><th>Last active</th><th>Logins</th><th>Tabs</th><th>Accounts opened</th><th>Status changes</th><th>Syncs</th><th>Status</th></tr>';
      rows.forEach(function(r){
        var stale=(now-(r.lastActive||0))>WEEK;
        var badge=stale?'<span style="color:#e2495b;font-weight:600">⚠ inactive 7d+</span>':'<span style="color:#026b3f;font-weight:600">● active</span>';
        html+='<tr style="border-bottom:1px solid #f0f0f4"><td style="padding:10px;font-weight:600">'+esc(r.user)+'</td><td>'+fmtAgo(r.lastActive)+'</td><td>'+(r.logins||0)+'</td><td>'+(r.tabViews||0)+'</td><td>'+(r.accountOpens||0)+'</td><td>'+(r.statusChanges||0)+'</td><td>'+(r.syncs||0)+'</td><td>'+badge+'</td></tr>';
      });
      html+='</table>';
      var seen=rows.map(function(r){return r.user;});
      var missing=TEAM.filter(function(n){return seen.indexOf(n)<0;});
      if(missing.length) html+='<div style="margin-top:14px;color:#e2495b;font-size:13px"><b>Never logged in:</b> '+missing.map(esc).join(", ")+'</div>';
      var rec=(d.recent||[]);
      html+='<div style="margin-top:20px;font-weight:700;color:#101114">Recent activity</div><div style="margin-top:8px;font-size:12px;color:#686b82">';
      rec.slice(0,25).forEach(function(e){ html+='<div style="padding:3px 0">'+fmtAgo(e.ts)+' — <b>'+esc(e.user)+'</b> '+esc(e.event)+(e.detail?(' · '+esc(e.detail)):'')+'</div>'; });
      html+='</div>';
      document.getElementById("gtmUsageBody").innerHTML=html;
    }).catch(function(e){ document.getElementById("gtmUsageBody").textContent="Could not load report: "+e; });
  }

  function addUsageButton(){
    if(document.getElementById("gtmUsageBtn")) return;
    var b=document.createElement("button");
    b.id="gtmUsageBtn"; b.textContent="📊 Usage";
    b.style.cssText="position:fixed;right:16px;bottom:16px;z-index:99990;background:#7132f5;color:#fff;border:none;border-radius:24px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(113,50,245,.4);font-family:'IBM Plex Sans',system-ui,sans-serif";
    b.onclick=openUsage;
    document.body.appendChild(b);
  }

  var KNOWN_TABS=["Start here","Overview","Accounts","Performance","Signals","Market (TAM/SAM)","ICP & Personas","Outbound Engine","14-Day Plan"];
  document.addEventListener("click",function(e){
    try{
      var el=e.target, txt=(el.textContent||"").trim();
      if(/^sync$/i.test(txt)){ track("sync"); return; }
      for(var i=0;i<KNOWN_TABS.length;i++){ if(txt===KNOWN_TABS[i] && txt.length<30){ track("tab_view",txt); return; } }
      var tr=el.closest && el.closest("tr");
      if(tr){ var fc=tr.querySelector("td"); if(fc){ var fn=(fc.textContent||"").trim().slice(0,60); if(fn) track("account_open",fn); } }
    }catch(_){}
  }, true);
  document.addEventListener("change",function(e){
    try{ if(e.target && e.target.tagName==="SELECT"){ track("status_change",(e.target.value||"").slice(0,40)); } }catch(_){}
  }, true);

  function boot(){ ensureUser(function(){ track("login"); }); addUsageButton(); }
  if(document.readyState==="loading"){ document.addEventListener("DOMContentLoaded",boot); } else { boot(); }
})();
