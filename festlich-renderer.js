/* ══════════════════════════════════════════════════════════
   FESTLICH SHARED RENDERER ENGINE v3
   Single source of truth for ALL invitation rendering.
   Used by: builder preview, public invitation page, export/download
   ══════════════════════════════════════════════════════════ */

(function(global){
'use strict';

/* ── DATE CONSTANTS ── */
const MO=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const WD=['Mo','Di','Mi','Do','Fr','Sa','So'];
const ICONS={church:'⛪',mosque:'🕌',registry:'🏛️',garden:'🌿',beach:'🌊',custom:'🏡'};

/* ── DATE HELPERS ── */
function fmtShort(s){if(!s)return'';const d=new Date(s+'T12:00:00');return`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`}
function fmtLong(s){if(!s)return'';return new Date(s+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function dateParts(s){if(!s)return{d:'',m:'',y:''};const d=new Date(s+'T12:00:00');return{d:String(d.getDate()).padStart(2,'0'),m:String(d.getMonth()+1).padStart(2,'0'),y:d.getFullYear()}}

/* ── CALENDAR ── */
function buildCal(dateStr,cellClass,wdClass){
  if(!dateStr)return'';
  const d=new Date(dateStr+'T12:00:00');
  const yr=d.getFullYear(),mo=d.getMonth(),dy=d.getDate();
  const first=new Date(yr,mo,1).getDay(),offset=first===0?6:first-1;
  const total=new Date(yr,mo+1,0).getDate();
  const today=new Date();today.setHours(0,0,0,0);
  let cells='';
  for(let i=0;i<offset;i++)cells+=`<div class="cal-cell empty"></div>`;
  for(let dd=1;dd<=total;dd++){
    const active=dd===dy,past=new Date(yr,mo,dd)<today;
    cells+=`<div class="cal-cell${active?' active':past?' past':''}">${dd}</div>`;
  }
  return `<div class="cal-outer"><div class="cal-wdays">${WD.map(w=>`<div class="${wdClass}">${w}</div>`).join('')}</div><div class="cal-grid ${cellClass}">${cells}</div></div>`;
}

/* ── COUNTDOWN SCRIPT (injected into HTML) ── */
function countdownScript(dateStr,timeStr){
  if(!dateStr)return'';
  const hm=(timeStr||'14:00:00').slice(0,5);
  return `<script>(function(){var t=new Date('${dateStr}T${hm||'14:00'}');var p=function(n){return String(Math.max(0,n)).padStart(2,'0')};var tick=function(){var d=t-Date.now();if(d<=0){['cd-d','cd-h','cd-m','cd-s','cd-d2','cd-h2','cd-m2'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent='00'});clearInterval(window._cd);return}[['cd-d',Math.floor(d/864e5)],['cd-h',Math.floor(d%864e5/36e5)],['cd-m',Math.floor(d%36e5/6e4)],['cd-s',Math.floor(d%6e4/1e3)],['cd-d2',Math.floor(d/864e5)],['cd-h2',Math.floor(d%864e5/36e5)],['cd-m2',Math.floor(d%36e5/6e4)]].forEach(function(a){var e=document.getElementById(a[0]);if(e)e.textContent=p(a[1])})};tick();window._cd=setInterval(tick,1000)})();<\/script>`;
}

/* ── GALLERY ── */
function galHTML(pics,aspect='4/3'){
  if(!pics||!pics.length)return'';
  if(pics.length===1)return`<div class="gal-1"><div class="gal-cell" style="aspect-ratio:16/9"><img src="${pics[0].url}" style="object-position:${pics[0].position_x||50}% ${pics[0].position_y||50}%;transform:scale(${pics[0].scale||1})" alt=""></div></div>`;
  return`<div class="gal-2">${pics.slice(0,4).map((g,i)=>`<div class="gal-cell" style="aspect-ratio:${i===0&&pics.length>2?'2/1':aspect}"><img src="${g.url}" style="object-position:${g.position_x||50}% ${g.position_y||50}%;transform:scale(${g.scale||1})" alt=""></div>`).join('')}</div>`;
}

/* ── RSVP FIELDS ── */
function rsvpFields(inv,theme){
  const hasMeal=inv.collect_meal_pref;
  const maxG=inv.max_guests_per_rsvp||4;
  return`<div class="rsvp-wrap ${theme}">
    <input class="rf" id="rsvp-name" type="text" placeholder="Vollständiger Name">
    <input class="rf" id="rsvp-phone" type="text" placeholder="Telefonnummer">
    <input class="rf" id="rsvp-guests" type="number" min="1" max="${maxG}" placeholder="Anzahl Gäste" value="1">
    ${hasMeal?`<select class="rf" id="rsvp-meal"><option value="meat">🥩 Fleisch</option><option value="fish">🐟 Fisch</option><option value="vegetarian">🥗 Vegetarisch</option><option value="vegan">🌱 Vegan</option></select>`:'<input type="hidden" id="rsvp-meal" value="none">'}
    <div class="rradio">
      <label class="rr-btn"><input type="radio" name="attending" value="yes" checked> Freudig Zusage</label>
      <label class="rr-btn"><input type="radio" name="attending" value="no"> Leider Absage</label>
    </div>
    <button class="rsub" id="rsvp-btn">Zusage bestätigen</button>
    <div class="rok" id="rsvp-ok">✓ Danke! Deine Zusage ist eingegangen.</div>
  </div>`;
}

/* ── TIMING ROWS ── */
function timingRows(tl,cls){
  if(!tl||!tl.length)return'';
  return tl.map(t=>`<div class="${cls||'timing'}-row"><span class="${cls||'timing'}-time">${t.time||''}</span><span style="margin:0 8px;opacity:.4">—</span><span class="${cls||'timing'}-label">${t.title||''}</span></div>`).join('');
}

/* ══════════════════════════════════════════════════════════
   TEMPLATE RENDERERS
   ══════════════════════════════════════════════════════════ */

function renderBlossom(inv,gallery){
  const n1=inv.host_name_1||'',n2=inv.host_name_2||'';
  const hasImg=!!inv.hero_image_url,hasCer=inv.ceremony_venue_name||inv.ceremony_address;
  const tl=inv.timeline_json||[],pics=(gallery||[]).filter(g=>g.url);
  return`<div class="t-blossom">
  <div class="bl-hero">
    ${hasImg?`<img class="bl-hero-bg" src="${inv.hero_image_url}" style="object-position:${inv.hero_pos_x||50}% ${inv.hero_pos_y||50}%;transform:scale(${inv.hero_scale||1})" alt="">`:'<div class="bl-hero-no-img"></div>'}
    <div class="bl-hero-overlay"></div>
    <div class="bl-hero-texture"></div>
    <div class="bl-flowers">🌸🌼🌺🌸🌼🌸🌺🌼🌸🌺🌸🌼🌸🌺🌸</div>
    <div class="bl-angel" style="top:10%;left:3%;transform:rotate(-14deg)">👼</div>
    <div class="bl-angel" style="top:18%;right:4%;transform:rotate(10deg) scaleX(-1);font-size:34px">👼</div>
    <div class="bl-angel" style="top:38%;right:3%;font-size:26px;transform:rotate(6deg)">🕊️</div>
    <div class="bl-angel" style="top:55%;left:2%;font-size:24px;transform:rotate(-10deg)">🕊️</div>
    <div class="bl-arch">
      <span class="bl-arch-eyebrow">Hochzeit</span>
      <div class="bl-arch-names">${n1} <span class="bl-arch-amp">&amp;</span> ${n2}</div>
      ${inv.event_date?`<div class="bl-arch-date">${fmtShort(inv.event_date)}</div>`:''}
      ${inv.tagline?`<div class="bl-arch-tagline">${inv.tagline}</div>`:''}
    </div>
  </div>
  ${inv.quote_enabled&&inv.quote_text?`<div class="bl-sec"><div class="bl-quote">${inv.quote_heading?`<span class="bl-label">${inv.quote_heading}</span>`:''}<div class="bl-quote-text">${inv.quote_text}</div>${inv.quote_source?`<div class="bl-quote-src">— ${inv.quote_source}</div>`:''}</div></div>`:''}
  ${inv.event_date?`<div class="bl-sec-lav"><div style="font-size:28px;margin-bottom:12px">👼</div><span class="bl-label-lt">Der Date</span><div class="bl-cal-month">${MO[new Date(inv.event_date+'T12:00:00').getMonth()]} ${new Date(inv.event_date+'T12:00:00').getFullYear()}</div>${buildCal(inv.event_date,'bl-cal','bl-cal-wd')}<div class="cd-row bl-cd"><div class="cd-box"><span class="cd-num" id="cd-d">–</span><span class="cd-lbl">Tage</span></div><div class="cd-box"><span class="cd-num" id="cd-h">–</span><span class="cd-lbl">Std.</span></div><div class="cd-box"><span class="cd-num" id="cd-m">–</span><span class="cd-lbl">Min.</span></div><div class="cd-box"><span class="cd-num" id="cd-s">–</span><span class="cd-lbl">Sek.</span></div></div></div>`:''}
  ${hasCer?`<div class="bl-sec"><span class="bl-label">${inv.event_date?'Der Abend des '+fmtShort(inv.event_date):''}</span><div class="bl-cer"><div class="bl-cer-ico">${ICONS[inv.ceremony_venue_type]||'📍'}</div><div class="bl-cer-title">${inv.ceremony_title||'Zeremonie'}</div>${inv.ceremony_venue_name?`<div class="bl-cer-name">${inv.ceremony_venue_name}</div>`:''}${inv.ceremony_time?`<div class="bl-cer-time">🕐 ${inv.ceremony_time.slice(0,5)} Uhr</div>`:''}${inv.ceremony_address?`<div class="bl-cer-addr">${inv.ceremony_address.replace(/\n/g,'<br>')}</div>`:''}${inv.ceremony_description?`<p style="font-size:12.5px;color:#9080A0;font-style:italic;margin-top:8px">${inv.ceremony_description}</p>`:''}${inv.ceremony_map_url?`<a class="bl-map-btn" href="${inv.ceremony_map_url}" target="_blank">📍 Karte</a>`:''}</div></div>`:''}
  ${inv.welcome_note?`<div class="bl-sec-lav"><div style="font-size:24px;margin-bottom:10px">🕊️</div><div class="bl-title-lt">Mit offenen Herzen</div><p class="bl-text-lt bl-italic" style="max-width:340px;margin:0 auto">${inv.welcome_note.replace(/\n/g,'<br>')}</p><div style="margin-top:12px;font-size:12px;color:rgba(255,255,255,.5)">Herzlich willkommen</div></div>`:''}
  ${tl.length>0&&inv.reception_enabled?`<div class="bl-sec"><div class="bl-timing"><div class="bl-timing-title">Ablauf</div>${timingRows(tl,'bl-timing')}</div><div style="text-align:center;font-size:30px;margin-top:14px">👼</div></div>`:''}
  ${pics.length>0?galHTML(pics):''}
  ${inv.rsvp_enabled?`<div class="bl-rsvp-sec"><div style="font-size:24px;margin-bottom:10px">💌</div><div class="bl-rsvp-title">Sei unser Gast</div><div class="bl-rsvp-sub">Bitte bestätige uns deine Teilnahme${inv.rsvp_deadline?'<br>Bis '+fmtShort(inv.rsvp_deadline):''}</div>${rsvpFields(inv,'bl-rsvp')}</div>`:''}
  ${inv.registry_message?`<div class="bl-sec-dk"><div class="gifts-ico">🎁</div><div class="bl-title-lt" style="font-size:32px">Geschenke</div><p class="bl-text-lt" style="max-width:320px;margin:0 auto">${inv.registry_message}</p></div>`:''}
  ${inv.dress_code?`<div class="bl-sec"><span class="bl-label">Dresscode</span><p class="bl-text">${inv.dress_code}</p></div>`:''}
  <div style="background:#3A2A3A;padding:22px;text-align:center"><div class="fbrand-txt" style="color:rgba(248,244,252,.4)">Festlich<span style="color:#C8A060">.</span></div><div class="fbrand-copy" style="color:rgba(255,255,255,.2)">© ${new Date().getFullYear()} ${n1} &amp; ${n2}</div></div>
  </div>`;
}

function renderMono(inv,gallery){
  const n1=inv.host_name_1||'',n2=inv.host_name_2||'';
  const hasImg=!!inv.hero_image_url,hasCer=inv.ceremony_venue_name||inv.ceremony_address;
  const tl=inv.timeline_json||[],pics=(gallery||[]).filter(g=>g.url);
  return`<div class="t-mono">
  <div class="mn-hero">${hasImg?`<img class="mn-hero-img" src="${inv.hero_image_url}" style="object-position:${inv.hero_pos_x||50}% ${inv.hero_pos_y||50}%;transform:scale(${inv.hero_scale||1})" alt="">`:'<div class="mn-hero-no-img"></div>'}</div>
  <div class="mn-hero-text">
    <div class="mn-label">Hochzeitseinladung</div>
    <div class="mn-names">${n1}<span class="mn-amp">&amp;</span>${n2}</div>
    ${inv.event_date?`<div class="mn-date-frame">${fmtShort(inv.event_date)}</div>`:''}
    ${inv.tagline?`<p style="font-size:13px;color:#666;font-weight:300;margin-top:10px;font-style:italic">${inv.tagline}</p>`:''}
  </div>
  ${inv.quote_enabled&&inv.quote_text?`<div class="mn-rule"></div><div class="mn-sec">${inv.quote_heading?`<div class="mn-label">${inv.quote_heading}</div>`:''}<span class="mn-quote-mark">&ldquo;</span><p style="font-family:'Playfair Display',serif;font-style:italic;font-size:clamp(16px,3vw,21px);color:#222;line-height:1.72">${inv.quote_text}</p>${inv.quote_source?`<div style="font-size:12px;color:#888;margin-top:10px">— ${inv.quote_source}</div>`:''}</div>`:''}
  ${pics.length>=2?`<div class="mn-img-pair">${pics.slice(0,2).map(g=>`<img src="${g.url}" style="object-position:${g.position_x||50}% ${g.position_y||50}%" alt="">`).join('')}</div>`:pics.length===1?`<div class="mn-rule"></div><div class="mn-img-single"><img src="${pics[0].url}" style="object-position:${pics[0].position_x||50}% ${pics[0].position_y||50}%" alt=""></div>`:''}
  ${inv.event_date?`<div class="mn-rule"></div><div class="mn-sec-dk" style="text-align:center"><div class="mn-label-lt">Der Date</div><div class="mn-cal-month">${MO[new Date(inv.event_date+'T12:00:00').getMonth()]} ${new Date(inv.event_date+'T12:00:00').getFullYear()}</div>${buildCal(inv.event_date,'mn-cal','mn-cal-wd')}<div class="cd-row mn-cd" style="margin-top:32px"><div class="cd-box"><span class="cd-num" id="cd-d">–</span><span class="cd-lbl" style="font-family:'Josefin Sans',sans-serif;font-size:9px">TAGE</span></div><div class="cd-box"><span class="cd-num" id="cd-h">–</span><span class="cd-lbl" style="font-family:'Josefin Sans',sans-serif;font-size:9px">STD</span></div><div class="cd-box"><span class="cd-num" id="cd-m">–</span><span class="cd-lbl" style="font-family:'Josefin Sans',sans-serif;font-size:9px">MIN</span></div><div class="cd-box"><span class="cd-num" id="cd-s">–</span><span class="cd-lbl" style="font-family:'Josefin Sans',sans-serif;font-size:9px">SEK</span></div></div></div>`:''}
  ${tl.length>0&&inv.reception_enabled?`<div class="mn-rule-lt"></div><div class="mn-sec"><div class="mn-label">The Agenda</div><div class="mn-title">${inv.reception_title||'Ablauf'}</div>${tl.map(t=>`<div class="timing-row" style="border-color:#EAEAEA"><span class="timing-time" style="color:#888;font-family:'Josefin Sans',sans-serif;font-size:12px;letter-spacing:.08em">${t.time||''}</span><span style="color:#888;margin:0 10px">—</span><span class="timing-label" style="color:#111">${t.title||''}</span></div>`).join('')}</div>`:''}
  ${hasCer?`<div class="mn-rule-lt"></div><div class="mn-sec"><div class="mn-label">Ceremony</div><div class="mn-title">${inv.ceremony_title||'Zeremonie'}</div>${inv.ceremony_venue_name?`<div class="mn-cer-row"><span class="mn-cer-ico">${ICONS[inv.ceremony_venue_type]||'📍'}</span><div><div class="mn-cer-lbl">Location</div><div class="mn-cer-val">${inv.ceremony_venue_name}</div>${inv.ceremony_address?`<div class="mn-cer-sub">${inv.ceremony_address}</div>`:''}</div></div>`:''}${inv.ceremony_time?`<div class="mn-cer-row"><span class="mn-cer-ico">🕐</span><div><div class="mn-cer-lbl">Zeit</div><div class="mn-cer-val">${inv.ceremony_time.slice(0,5)} Uhr</div></div></div>`:''}${inv.ceremony_map_url?`<div class="mn-map-btns"><a class="mn-map-pill" href="${inv.ceremony_map_url}" target="_blank">📍 Zeremonie</a></div>`:''}</div>`:''}
  ${pics.length>2?`<div class="mn-rule-lt"></div><div class="mn-img-pair">${pics.slice(2,4).map(g=>`<img src="${g.url}" style="object-position:${g.position_x||50}% ${g.position_y||50}%;filter:grayscale(100%)" alt="">`).join('')}</div>`:''}
  ${inv.rsvp_enabled?`<div class="mn-rule-lt"></div><div class="mn-sec"><div class="mn-label">RSVP</div><div class="mn-title">Sei unser Gast</div>${rsvpFields(inv,'mn-rsvp')}</div>`:''}
  ${inv.registry_message?`<div class="mn-rule"></div><div class="mn-sec"><div class="mn-label">Geschenke</div><p class="mn-text">${inv.registry_message}</p></div>`:''}
  ${inv.dress_code?`<div class="mn-rule-lt"></div><div class="mn-sec"><div class="mn-label">Dress Code</div><p class="mn-text">${inv.dress_code}</p></div>`:''}
  <div style="background:#111;padding:22px;text-align:center"><div style="font-family:'Playfair Display',serif;font-style:italic;font-size:22px;color:rgba(255,255,255,.28)">Festlich<span style="color:#A87C3E">.</span></div><div class="fbrand-copy" style="color:rgba(255,255,255,.18)">© ${new Date().getFullYear()} ${n1} &amp; ${n2}</div></div>
  </div>`;
}

function renderBoho(inv,gallery){
  const n1=inv.host_name_1||'',n2=inv.host_name_2||'';
  const hasImg=!!inv.hero_image_url,hasCer=inv.ceremony_venue_name||inv.ceremony_address;
  const tl=inv.timeline_json||[],pics=(gallery||[]).filter(g=>g.url);
  return`<div class="t-boho">
  <div class="bh-hero">${hasImg?`<img class="bh-hero-img" src="${inv.hero_image_url}" style="object-position:${inv.hero_pos_x||50}% ${inv.hero_pos_y||50}%;transform:scale(${inv.hero_scale||1})" alt="">`:'<div style="height:85vw;max-height:420px;background:linear-gradient(160deg,#E8D5C0,#C4A882)"></div>'}<div class="bh-hero-overlay"></div><div class="bh-hero-text"><div class="bh-label">Hochzeit</div><div class="bh-names">${n1}<span class="bh-amp">&amp;</span>${n2}</div>${inv.event_date?`<div class="bh-date">${fmtShort(inv.event_date)}</div>`:''}</div></div>
  ${inv.quote_enabled&&inv.quote_text?`<div class="bh-sec"><div class="bh-rule"></div><span class="bh-quote-mark">&ldquo;</span><p class="bh-quote">${inv.quote_text}</p>${inv.quote_source?`<div class="bh-quote-source">— ${inv.quote_source}</div>`:''}</div>`:''}
  ${pics.length>0?`<div class="bh-img-grid">${pics.slice(0,4).map(g=>`<img src="${g.url}" style="object-position:${g.position_x||50}% ${g.position_y||50}%" alt="">`).join('')}</div>`:''}
  ${inv.event_date?`<div class="bh-sec" style="text-align:center"><div class="bh-rule"></div><div class="bh-sub">Der Date</div><div class="bh-cal-month">${MO[new Date(inv.event_date+'T12:00:00').getMonth()]} ${new Date(inv.event_date+'T12:00:00').getFullYear()}</div>${buildCal(inv.event_date,'bh-cal','bh-cal-wd')}<div class="cd-row bh-cd" style="margin-top:28px"><div class="cd-box"><span class="cd-num" id="cd-d">–</span><span class="cd-lbl">TAGE</span></div><div class="cd-box"><span class="cd-num" id="cd-h">–</span><span class="cd-lbl">STD</span></div><div class="cd-box"><span class="cd-num" id="cd-m">–</span><span class="cd-lbl">MIN</span></div><div class="cd-box"><span class="cd-num" id="cd-s">–</span><span class="cd-lbl">SEK</span></div></div></div>`:''}
  ${tl.length>0&&inv.reception_enabled?`<div class="bh-sec"><div class="bh-rule"></div><div class="bh-sub">Ablauf</div><div class="bh-title">${inv.reception_title||'Zeitplan'}</div><div class="bh-timing">${tl.map(t=>`<div class="timing-row"><span class="timing-time">${t.time||''}</span><span style="color:#A67C52;margin:0 10px">—</span><span class="timing-label">${t.title||''}</span></div>`).join('')}</div></div>`:''}
  ${hasCer?`<div class="bh-sec"><div class="bh-rule"></div><div class="bh-sub">Zeremonie</div><div class="bh-title">${inv.ceremony_title||'Zeremonie'}</div>${inv.ceremony_venue_name?`<div style="display:flex;align-items:flex-start;margin-bottom:14px"><span class="bh-cer-ico">${ICONS[inv.ceremony_venue_type]||'📍'}</span><div><div class="bh-cer-lbl">Ort</div><div class="bh-cer-val">${inv.ceremony_venue_name}</div>${inv.ceremony_address?`<div class="bh-cer-sub">${inv.ceremony_address}</div>`:''}</div></div>`:''}${inv.ceremony_time?`<div style="display:flex;align-items:flex-start;margin-bottom:14px"><span class="bh-cer-ico">🕐</span><div><div class="bh-cer-lbl">Zeit</div><div class="bh-cer-val">${inv.ceremony_time.slice(0,5)} Uhr</div></div></div>`:''}${inv.ceremony_map_url?`<div style="text-align:center"><a class="bh-map-btn" href="${inv.ceremony_map_url}" target="_blank">📍 Karte öffnen</a></div>`:''}</div>`:''}
  ${inv.welcome_note?`<div class="bh-sec"><div class="bh-rule"></div><div class="bh-sub">Willkommen</div><p class="bh-text">${inv.welcome_note}</p></div>`:''}
  ${inv.rsvp_enabled?`<div class="bh-rsvp"><div class="bh-sub" style="color:rgba(255,255,255,.55)">RSVP</div><div class="bh-title" style="color:white;margin-bottom:6px">Sei unser Gast</div>${rsvpFields(inv,'bh-rsvp')}</div>`:''}
  ${inv.registry_message?`<div class="bh-gifts"><div class="bh-sub">Geschenke</div><p class="bh-text">${inv.registry_message}</p></div>`:''}
  <div class="bh-footer"><div class="bh-footer-logo">Festlich<span style="color:#A67C52">.</span></div><div class="fbrand-copy" style="color:#B0A090;font-size:11px;margin-top:6px">© ${new Date().getFullYear()} ${n1} &amp; ${n2}</div></div>
  </div>`;
}

function renderAzur(inv,gallery){
  const n1=inv.host_name_1||'',n2=inv.host_name_2||'';
  const hasImg=!!inv.hero_image_url,hasCer=inv.ceremony_venue_name||inv.ceremony_address;
  const tl=inv.timeline_json||[],pics=(gallery||[]).filter(g=>g.url);
  return`<div class="t-azur">
  <div class="az-hero">${hasImg?`<img class="az-hero-img" src="${inv.hero_image_url}" style="object-position:${inv.hero_pos_x||50}% ${inv.hero_pos_y||50}%;transform:scale(${inv.hero_scale||1})" alt="">`:'<div style="height:75vw;max-height:380px;background:linear-gradient(135deg,#87CEEB,#5F9EA0 50%,#4682B4)"></div>'}<div class="az-hero-text"><div class="az-label">Hochzeit</div><div class="az-names">${n1}<span class="az-amp">&amp;</span>${n2}</div>${inv.event_date?`<div class="az-date">${fmtShort(inv.event_date)}</div>`:''}${inv.tagline?`<p style="font-size:13px;color:#7A6A5A;font-weight:300;margin-top:10px;font-style:italic">${inv.tagline}</p>`:''}</div></div>
  ${inv.quote_enabled&&inv.quote_text?`<div class="az-sec"><div class="az-rule"></div><div class="az-quote">${inv.quote_text}${inv.quote_source?`<div class="az-quote-source">— ${inv.quote_source}</div>`:''}</div></div>`:''}
  ${pics.length>0?`<div class="az-img-grid">${pics.slice(0,4).map(g=>`<img src="${g.url}" style="object-position:${g.position_x||50}% ${g.position_y||50}%" alt="">`).join('')}</div>`:''}
  ${inv.event_date?`<div class="az-sec" style="text-align:center"><div class="az-rule"></div><div class="az-sub">Der Date</div><div class="az-cal-month">${MO[new Date(inv.event_date+'T12:00:00').getMonth()]} ${new Date(inv.event_date+'T12:00:00').getFullYear()}</div>${buildCal(inv.event_date,'az-cal','az-cal-wd')}<div class="cd-row az-cd" style="margin-top:24px"><div class="cd-box"><span class="cd-num" id="cd-d">–</span><span class="cd-lbl">TAGE</span></div><div class="cd-box"><span class="cd-num" id="cd-h">–</span><span class="cd-lbl">STD</span></div><div class="cd-box"><span class="cd-num" id="cd-m">–</span><span class="cd-lbl">MIN</span></div><div class="cd-box"><span class="cd-num" id="cd-s">–</span><span class="cd-lbl">SEK</span></div></div></div>`:''}
  ${tl.length>0&&inv.reception_enabled?`<div class="az-sec"><div class="az-rule"></div><div class="az-sub">Ablauf</div><div class="az-title">${inv.reception_title||'Zeitplan'}</div><div class="az-timing">${tl.map(t=>`<div class="timing-row"><span class="timing-time">${t.time||''}</span><span class="timing-dot"></span><span class="timing-label">${t.title||''}</span></div>`).join('')}</div></div>`:''}
  ${hasCer?`<div class="az-sec"><div class="az-rule"></div><div class="az-sub">Zeremonie</div><div class="az-title">${inv.ceremony_title||'Zeremonie'}</div>${inv.ceremony_venue_name?`<div style="display:flex;align-items:flex-start;margin-bottom:14px"><span class="az-cer-ico">${ICONS[inv.ceremony_venue_type]||'📍'}</span><div><div class="az-cer-lbl">Ort</div><div class="az-cer-val">${inv.ceremony_venue_name}</div>${inv.ceremony_address?`<div class="az-cer-sub">${inv.ceremony_address}</div>`:''}</div></div>`:''}${inv.ceremony_time?`<div style="display:flex;align-items:flex-start;margin-bottom:14px"><span class="az-cer-ico">🕐</span><div><div class="az-cer-lbl">Zeit</div><div class="az-cer-val">${inv.ceremony_time.slice(0,5)} Uhr</div></div></div>`:''}${inv.ceremony_map_url?`<div style="text-align:center"><a class="az-map-btn" href="${inv.ceremony_map_url}" target="_blank">📍 Karte öffnen</a></div>`:''}</div>`:''}
  ${inv.welcome_note?`<div class="az-sec"><div class="az-rule"></div><div class="az-sub">Willkommen</div><p class="az-text">${inv.welcome_note}</p></div>`:''}
  ${inv.rsvp_enabled?`<div class="az-rsvp"><div class="az-sub" style="color:rgba(255,255,255,.45)">RSVP</div><div class="az-title" style="color:white;margin-bottom:6px">Sei unser Gast</div>${rsvpFields(inv,'az-rsvp')}</div>`:''}
  ${inv.registry_message?`<div class="az-gifts"><div class="az-sub">Geschenke</div><p class="az-text">${inv.registry_message}</p></div>`:''}
  <div class="az-footer"><div class="az-footer-logo">Festlich<span style="color:#B8922A">.</span></div><div class="fbrand-copy" style="color:#B8B0A8;font-size:11px;margin-top:6px">© ${new Date().getFullYear()} ${n1} &amp; ${n2}</div></div>
  </div>`;
}

function renderEternal(inv,gallery){
  const n1=inv.host_name_1||'',n2=inv.host_name_2||'';
  const hasImg=!!inv.hero_image_url,hasCer=inv.ceremony_venue_name||inv.ceremony_address;
  const tl=inv.timeline_json||[],pics=(gallery||[]).filter(g=>g.url);
  const dp=dateParts(inv.event_date);
  return`<div class="t-eternal">
  <div class="et-hero">${hasImg?`<img class="et-hero-img" src="${inv.hero_image_url}" style="object-position:${inv.hero_pos_x||50}% ${inv.hero_pos_y||50}%;transform:scale(${inv.hero_scale||1})" alt="">`:'<div class="et-hero-no-img"></div>'}<div class="et-hero-grad"></div><div class="et-hero-content">${dp.d?`<div class="et-date-label">Hochzeitsdatum</div><div class="et-date-stack"><span class="et-date-num">${dp.d}</span><span class="et-date-dot">·</span><span class="et-date-num">${dp.m}</span><span class="et-date-dot">·</span><span class="et-date-num">${String(dp.y).slice(2)}</span></div>`:''}<div style="height:18px"></div><div class="et-names">${n1} <span class="et-names-amp">&amp;</span> ${n2}</div>${inv.tagline?`<div class="et-tagline">${inv.tagline}</div>`:''}</div></div>
  ${inv.quote_enabled&&inv.quote_text?`<div class="et-sec">${inv.quote_heading?`<span class="et-label">${inv.quote_heading}</span>`:''}<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(17px,3vw,22px);color:#3A2E24;line-height:1.72;max-width:400px;margin:0 auto">${inv.quote_text}</p>${inv.quote_source?`<div style="margin-top:12px;font-size:13px;color:#C4A882">— ${inv.quote_source}</div>`:''}<div class="et-rule"></div></div>`:''}
  ${pics.length>0?`<div style="display:flex;justify-content:center;gap:14px;padding:0 24px 4px">${pics.slice(0,2).map(g=>`<img class="et-arch-portrait" src="${g.url}" style="object-position:${g.position_x||50}% ${g.position_y||50}%" alt="">`).join('')}</div>`:''}
  ${inv.event_date?`<div class="et-sec"><span class="et-label">Der Date</span><div class="et-cal-month">${MO[new Date(inv.event_date+'T12:00:00').getMonth()]} ${new Date(inv.event_date+'T12:00:00').getFullYear()}</div>${buildCal(inv.event_date,'et-cal','et-cal-wd')}</div><div class="et-sec-tan"><span class="et-label">Countdown</span><div class="et-big-cd"><div><span class="et-big-num" id="cd-d">–</span><span class="et-big-lbl">Tage</span></div><div><span class="et-big-num" id="cd-h">–</span><span class="et-big-lbl">Std.</span></div><div><span class="et-big-num" id="cd-m">–</span><span class="et-big-lbl">Min.</span></div></div></div>`:''}
  ${hasCer?`<div class="et-sec"><span class="et-label">Zeremonie</span><div class="et-title">${inv.ceremony_title||'Zeremonie'}</div><div class="et-ven-card"><div class="et-ven-ico">${ICONS[inv.ceremony_venue_type]||'📍'}</div>${inv.ceremony_venue_name?`<div class="et-ven-name">${inv.ceremony_venue_name}</div>`:''}${inv.ceremony_time?`<div class="et-ven-time">🕐 ${inv.ceremony_time.slice(0,5)} Uhr</div>`:''}${inv.ceremony_address?`<div class="et-ven-addr">${inv.ceremony_address.replace(/\n/g,'<br>')}</div>`:''}${inv.ceremony_description?`<p style="font-size:12.5px;color:#7A6858;font-style:italic;margin-top:8px">${inv.ceremony_description}</p>`:''}${inv.ceremony_map_url?`<a class="et-map-btn" href="${inv.ceremony_map_url}" target="_blank">📍 Karte</a>`:''}</div></div>`:''}
  ${inv.welcome_note?`<div class="et-sec-tan"><span class="et-label">Für unsere Gäste</span><p class="et-text" style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(16px,3vw,20px);max-width:380px;margin:0 auto">${inv.welcome_note.replace(/\n/g,'<br>')}</p></div>`:''}
  ${tl.length>0&&inv.reception_enabled?`<div class="et-sec"><span class="et-label">Tagesablauf</span><div class="et-title">${inv.reception_title||'Ablauf'}</div>${tl.map(t=>`<div class="timing-row" style="border-color:#EDE0CC;max-width:320px;margin:0 auto"><span class="timing-time" style="color:#C4A882">${t.time||''}</span><span style="margin:0 8px;opacity:.3">—</span><span class="timing-label" style="color:#3A2E24">${t.title||''}</span></div>`).join('')}</div>`:''}
  ${pics.length>2?`<div style="display:flex;justify-content:center;padding:0 24px 28px"><img class="et-arch-portrait-lg" src="${pics[2].url}" style="object-position:${pics[2].position_x||50}% ${pics[2].position_y||50}%" alt=""></div>`:''}
  ${inv.rsvp_enabled?`<div class="et-rsvp-sec"><div style="font-size:22px;margin-bottom:10px">💌</div><div class="et-rsvp-title">Sei unser Gast</div><div class="et-rsvp-sub">Bitte bestätige uns deine Teilnahme${inv.rsvp_deadline?'<br>Bis '+fmtShort(inv.rsvp_deadline):''}</div>${rsvpFields(inv,'et-rsvp')}</div>`:''}
  ${inv.registry_message?`<div class="et-sec-tan" style="text-align:center"><span class="et-label">Geschenke</span><p class="et-text" style="max-width:340px;margin:0 auto">${inv.registry_message}</p></div>`:''}
  ${inv.dress_code?`<div class="et-sec"><span class="et-label">Dresscode</span><p class="et-text">${inv.dress_code}</p></div>`:''}
  <div style="background:#3A2E24;padding:22px;text-align:center"><div style="font-family:'Great Vibes',cursive;font-size:22px;color:rgba(248,245,240,.35)">Festlich<span style="color:#C4A882">.</span></div><div class="fbrand-copy" style="color:rgba(255,255,255,.18)">© ${new Date().getFullYear()} ${n1} &amp; ${n2}</div></div>
  </div>`;
}

function renderVerde(inv,gallery){
  const n1=inv.host_name_1||'',n2=inv.host_name_2||'';
  const hasImg=!!inv.hero_image_url,hasCer=inv.ceremony_venue_name||inv.ceremony_address;
  const tl=inv.timeline_json||[],pics=(gallery||[]).filter(g=>g.url);
  return`<div class="t-verde">
  <div class="vd-hero-img-wrap">${hasImg?`<img src="${inv.hero_image_url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${inv.hero_pos_x||50}% ${inv.hero_pos_y||50}%;transform:scale(${inv.hero_scale||1})" alt=""><div class="vd-hero-overlay"></div>`:'<div class="vd-hero-no-img"></div>'}<div class="vd-hero-top-text">${inv.event_date?`<span class="vd-hero-date-top">${fmtShort(inv.event_date)}</span>`:'<span></span>'}<span class="vd-hero-name-top">${n1} &amp; ${n2}</span></div></div>
  <div class="vd-names-card"><span class="vd-eyebrow">Hochzeitseinladung</span><div class="vd-names">${n1}<br><span class="vd-names-amp">&amp;</span><br>${n2}</div>${inv.event_date?`<div class="vd-date">${fmtShort(inv.event_date)}</div>`:''}${inv.tagline?`<p style="font-size:12.5px;color:#7A8E6A;font-weight:300;margin-top:8px;font-style:italic">${inv.tagline}</p>`:''}</div>
  ${inv.quote_enabled&&inv.quote_text?`<div class="vd-sec">${inv.quote_heading?`<span class="vd-label">${inv.quote_heading}</span>`:''}<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(17px,3vw,22px);color:#2A3020;line-height:1.72;max-width:380px;margin:0 auto">${inv.quote_text}</p>${inv.quote_source?`<div style="margin-top:12px;font-size:13px;color:#7A8E6A">— ${inv.quote_source}</div>`:''}<div class="vd-rule"></div></div>`:''}
  ${pics.length>0?`<div class="vd-photo-grid">${pics.slice(0,2).map(g=>`<div class="vd-photo-cell"><img src="${g.url}" style="object-position:${g.position_x||50}% ${g.position_y||50}%" alt=""></div>`).join('')}</div>`:''}
  ${tl.length>0&&inv.reception_enabled?`<div class="vd-sec-green"><span class="vd-timing-label">Tagesablauf</span><div class="vd-timing-title">${inv.reception_title||'Tagesablauf'}</div>${tl.map(t=>`<div class="vd-timing-row" style="max-width:360px;margin:0 auto"><span class="vd-timing-time">${t.time||''}</span><span class="vd-timing-event">${t.title||''}</span></div>`).join('')}</div>`:''}
  ${inv.event_date?`<div class="vd-sec-green"><span class="vd-label-lt">Der Date</span><div class="vd-cal-month">${MO[new Date(inv.event_date+'T12:00:00').getMonth()]} ${new Date(inv.event_date+'T12:00:00').getFullYear()}</div>${buildCal(inv.event_date,'vd-cal','vd-cal-wd')}<div class="cd-row vd-cd"><div class="cd-box"><span class="cd-num" id="cd-d">–</span><span class="cd-lbl">Tage</span></div><div class="cd-box"><span class="cd-num" id="cd-h">–</span><span class="cd-lbl">Std.</span></div><div class="cd-box"><span class="cd-num" id="cd-m">–</span><span class="cd-lbl">Min.</span></div><div class="cd-box"><span class="cd-num" id="cd-s">–</span><span class="cd-lbl">Sek.</span></div></div></div>`:''}
  ${hasCer?`<div class="vd-sec"><span class="vd-label">Zeremonie &amp; Location</span><div class="vd-title">${inv.ceremony_title||'Zeremonie'}</div>${inv.ceremony_venue_name?`<div class="vd-cer-card"><div class="vd-cer-ico-wrap">${ICONS[inv.ceremony_venue_type]||'📍'}</div><div style="flex:1"><div class="vd-cer-lbl">Zeremonie</div><div class="vd-cer-name">${inv.ceremony_venue_name}</div>${inv.ceremony_time?`<div class="vd-cer-time">🕐 ${inv.ceremony_time.slice(0,5)} Uhr</div>`:''}${inv.ceremony_address?`<div class="vd-cer-addr">${inv.ceremony_address}</div>`:''}</div></div>`:''}${inv.ceremony_map_url?`<a class="vd-map-btn" href="${inv.ceremony_map_url}" target="_blank">📍 Karte</a>`:''}${inv.ceremony_description?`<p style="font-size:13px;color:#5A6850;font-weight:300;font-style:italic;margin-top:12px">${inv.ceremony_description}</p>`:''}</div>`:''}
  ${inv.welcome_note?`<div class="vd-sec-cream"><span class="vd-label">Für unsere Gäste</span><p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(16px,3vw,21px);color:#2A3020;line-height:1.72;max-width:380px;margin:0 auto">${inv.welcome_note.replace(/\n/g,'<br>')}</p></div>`:''}
  ${inv.rsvp_enabled?`<div class="vd-rsvp-sec"><div class="vd-rsvp-arch"><span class="vd-label">Sei unser Gast</span><div class="vd-rsvp-title">RSVP</div><div class="vd-rsvp-sub">Bitte bestätige uns deine Teilnahme${inv.rsvp_deadline?'<br>Bis '+fmtShort(inv.rsvp_deadline):''}</div>${rsvpFields(inv,'vd-rsvp')}</div></div>`:''}
  ${pics.length>2?`<div class="vd-photo-grid" style="padding:16px">${pics.slice(2,4).map(g=>`<div class="vd-photo-cell"><img src="${g.url}" style="object-position:${g.position_x||50}% ${g.position_y||50}%" alt=""></div>`).join('')}</div>`:''}
  ${inv.registry_message?`<div class="vd-sec-white" style="text-align:center"><span class="vd-label">Geschenke</span><p class="vd-text" style="max-width:340px;margin:0 auto">${inv.registry_message}</p></div>`:''}
  ${inv.dress_code?`<div class="vd-sec"><span class="vd-label">Dresscode</span><p class="vd-text">${inv.dress_code}</p></div>`:''}
  <div style="background:#2A3020;padding:22px;text-align:center"><div style="font-family:'Sacramento',cursive;font-size:24px;color:rgba(242,244,238,.3)">Festlich<span style="color:#7A8E6A">.</span></div><div class="fbrand-copy" style="color:rgba(255,255,255,.18)">© ${new Date().getFullYear()} ${n1} &amp; ${n2}</div></div>
  </div>`;
}

function renderFloral(inv,gallery){
  const n1=inv.host_name_1||'',n2=inv.host_name_2||'';
  const hasImg=!!inv.hero_image_url,hasCer=inv.ceremony_venue_name||inv.ceremony_address;
  const tl=inv.timeline_json||[],pics=(gallery||[]).filter(g=>g.url);
  return`<div class="t-floral">
  <div class="fl-hero"><div class="fl-hero-img-wrap">${hasImg?`<img class="fl-hero-img" src="${inv.hero_image_url}" style="object-position:${inv.hero_pos_x||50}% ${inv.hero_pos_y||50}%;transform:scale(${inv.hero_scale||1})" alt="">`:'<div class="fl-hero-no-img"></div>'}<div class="fl-leaf-top"><span class="fl-leaf-tl">🌿</span><span class="fl-leaf-tr">🌿</span></div></div><div class="fl-hero-text"><div class="fl-label">Hochzeitseinladung</div><div class="fl-names">${n1}<span class="fl-amp">&amp;</span>${n2}</div>${inv.event_date?`<div class="fl-date">${fmtShort(inv.event_date)}</div>`:''}${inv.tagline?`<p style="font-size:13px;color:#888;font-weight:300;margin-top:8px;font-style:italic">${inv.tagline}</p>`:''}</div></div>
  <div class="fl-rule"></div>
  ${inv.quote_enabled&&inv.quote_text?`<div class="fl-sec">${inv.quote_heading?`<div class="fl-label">${inv.quote_heading}</div>`:''}<div class="fl-quote"><div class="fl-quote-text">${inv.quote_text}</div>${inv.quote_source?`<div class="fl-quote-src">— ${inv.quote_source}</div>`:''}</div></div><div class="fl-rule"></div>`:''}
  ${tl.length>0&&inv.reception_enabled?`<div class="fl-sec"><div class="fl-label">Event Journey</div><div class="fl-title">${inv.reception_title||'Ablauf'}</div><div class="fl-journey">${tl.map(t=>`<div class="fl-journey-row"><span class="fl-j-time">${t.time||''}</span><span class="fl-j-event">${t.title||''}</span></div>`).join('')}</div></div><div class="fl-rule"></div>`:''}
  ${pics.length>0?`<div style="display:grid;grid-template-columns:${pics.length>=3?'1fr 1fr 1fr':'1fr 1fr'};gap:6px;padding:0 24px;margin:24px 0">${pics.slice(0,3).map(g=>`<div style="border-radius:10px;overflow:hidden;aspect-ratio:1"><img src="${g.url}" style="width:100%;height:100%;object-fit:cover;object-position:${g.position_x||50}% ${g.position_y||50}%" alt=""></div>`).join('')}</div><div class="fl-rule"></div>`:''}
  ${inv.event_date?`<div class="fl-sec-gray" style="text-align:center"><div class="fl-label">Der Date</div><div class="fl-cal-month">${MO[new Date(inv.event_date+'T12:00:00').getMonth()]} ${new Date(inv.event_date+'T12:00:00').getFullYear()}</div>${buildCal(inv.event_date,'fl-cal','fl-cal-wd')}</div><div style="padding:12px 22px 32px"><div class="fl-cd-wrap"><div class="fl-cd-bg">🍃</div><div class="fl-cd-title">Countdown</div><div class="cd-row fl-cd"><div class="cd-box"><span class="cd-num" id="cd-d">–</span><span class="cd-lbl">Tage</span></div><div class="cd-box"><span class="cd-num" id="cd-h">–</span><span class="cd-lbl">Std.</span></div><div class="cd-box"><span class="cd-num" id="cd-m">–</span><span class="cd-lbl">Min.</span></div><div class="cd-box"><span class="cd-num" id="cd-s">–</span><span class="cd-lbl">Sek.</span></div></div></div></div><div class="fl-rule"></div>`:''}
  ${hasCer?`<div class="fl-sec"><div class="fl-label">Locations</div><div class="fl-title">${inv.ceremony_title||'Zeremonie'}</div>${inv.ceremony_venue_name?`<div class="fl-cer-line"><span class="fl-cer-line-ico">${ICONS[inv.ceremony_venue_type]||'📍'}</span><div><div class="fl-cer-line-lbl">Location</div><div class="fl-cer-line-val">${inv.ceremony_venue_name}</div>${inv.ceremony_time?`<div class="fl-cer-line-sub">🕐 ${inv.ceremony_time.slice(0,5)} Uhr</div>`:''}${inv.ceremony_address?`<div class="fl-cer-line-sub">${inv.ceremony_address}</div>`:''}</div></div>`:''}${inv.ceremony_map_url?`<div class="fl-map-btns"><a class="fl-map-pill" href="${inv.ceremony_map_url}" target="_blank">📍 Karte</a></div>`:''}</div><div class="fl-rule"></div>`:''}
  ${inv.welcome_note?`<div class="fl-sec"><div class="fl-label">Für unsere Gäste</div><p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(16px,3vw,21px);color:#333;line-height:1.72;max-width:380px;margin:0 auto">${inv.welcome_note.replace(/\n/g,'<br>')}</p></div><div class="fl-rule"></div>`:''}
  ${inv.rsvp_enabled?`<div class="fl-rsvp-sec"><div style="font-size:22px;margin-bottom:10px">🌿</div><div class="fl-rsvp-title">Sei unser Gast</div><div class="fl-rsvp-sub">Bitte gib uns Bescheid, ob du mit uns feiern kannst${inv.rsvp_deadline?'<br>Bis '+fmtShort(inv.rsvp_deadline):''}</div>${rsvpFields(inv,'fl-rsvp')}</div><div class="fl-rule"></div>`:''}
  ${inv.dress_code?`<div class="fl-sec"><div class="fl-label">Dress Code</div><p class="fl-text">${inv.dress_code}</p><div class="fl-dress-dots"><div class="fl-dot" style="background:#7A8E6A"></div><div class="fl-dot" style="background:#4A5E40"></div><div class="fl-dot" style="background:#2A3020"></div><div class="fl-dot" style="background:#F0F0E8;border:1px solid #DDD"></div></div></div><div class="fl-rule"></div>`:''}
  ${inv.registry_message?`<div class="fl-sec"><div class="fl-label">Geschenke</div><p class="fl-text">${inv.registry_message}</p></div>`:''}
  ${pics.length>3?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:0 16px;margin:16px 0">${pics.slice(3,5).map(g=>`<div style="border-radius:10px;overflow:hidden;aspect-ratio:4/3"><img src="${g.url}" style="width:100%;height:100%;object-fit:cover;object-position:${g.position_x||50}% ${g.position_y||50}%" alt=""></div>`).join('')}</div>`:''}
  <div style="padding:22px;text-align:center;border-top:1px solid #F0F0EC"><div style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:22px;color:rgba(42,42,42,.3)">Festlich<span style="color:#7A8E6A">.</span></div><div class="fbrand-copy" style="color:#CCC">© ${new Date().getFullYear()} ${n1} &amp; ${n2}</div></div>
  </div>`;
}

/* ── DISPATCHER ── */
function renderBody(inv,gallery){
  const tpl=inv.font_preset||'blossom';
  if(tpl==='blossom') return renderBlossom(inv,gallery);
  if(tpl==='mono')    return renderMono(inv,gallery);
  if(tpl==='boho')    return renderBoho(inv,gallery);
  if(tpl==='azur')    return renderAzur(inv,gallery);
  if(tpl==='eternal') return renderEternal(inv,gallery);
  if(tpl==='verde')   return renderVerde(inv,gallery);
  return renderFloral(inv,gallery);
}

/* ══════════════════════════════════════════════════════════
   SHARED CSS — injected into every rendered invitation
   ══════════════════════════════════════════════════════════ */
const SHARED_CSS=`
/* ── RESET & BASE ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:'Josefin Sans',sans-serif;background:#F8F6F3;color:#333;line-height:1.6;overflow-x:hidden}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
input,select,textarea,button{font-family:inherit;font-size:inherit;border:none;outline:none;background:transparent}
button{cursor:pointer}

/* ── FONT IMPORTS ── */
@import url('https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@200;300;400;500;600&family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Sacramento&display=swap');

/* ── LAYOUT ── */
#invitation{display:none}
#invitation.active{display:block}
.gal-1,.gal-2{padding:0 24px;margin:24px 0}
.gal-1 .gal-cell,.gal-2 .gal-cell{border-radius:10px;overflow:hidden}
.gal-2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.gal-2 .gal-cell:first-child:nth-last-child(3),.gal-2 .gal-cell:first-child:nth-last-child(4){grid-column:span 2}
.gal-cell img{width:100%;height:100%;object-fit:cover}

/* ── CALENDAR ── */
.cal-outer{background:rgba(0,0,0,.03);border-radius:12px;padding:12px;margin-top:14px;max-width:380px;margin-left:auto;margin-right:auto}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:8px}
.cal-wdays{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.cal-cell{text-align:center;padding:6px 0;border-radius:8px;font-size:13px;font-weight:300;color:#555;transition:background .2s}
.cal-cell.active{background:var(--accent,#C8A060);color:#fff;font-weight:500}
.cal-cell.past{opacity:.3}
.cal-cell.empty{visibility:hidden}

/* ── COUNTDOWN ── */
.cd-row{display:flex;justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap}
.cd-box{background:rgba(0,0,0,.06);border-radius:12px;padding:14px 10px;min-width:64px;text-align:center}
.cd-num{font-size:clamp(26px,5vw,34px);font-weight:300;display:block;line-height:1}
.cd-lbl{font-size:9px;letter-spacing:.14em;text-transform:uppercase;opacity:.5;margin-top:4px;display:block}

/* ── RSVP SHARED ── */
.rsvp-wrap{padding:24px;display:flex;flex-direction:column;gap:10px}
.rf{background:rgba(0,0,0,.05);border:1.5px solid rgba(0,0,0,.08);border-radius:10px;padding:12px 14px;color:inherit;width:100%}
.rf::placeholder{color:rgba(0,0,0,.35)}
.rf:focus{border-color:var(--accent,#C8A060)}
.rradio{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:6px 0}
.rr-btn{cursor:pointer;font-size:13px;padding:10px 16px;border:1.5px solid rgba(0,0,0,.12);border-radius:100px;display:flex;align-items:center;gap:8px;transition:border-color .2s}
.rr-btn:hover{border-color:rgba(0,0,0,.3)}
.rr-btn input{cursor:pointer}
.rsub{background:var(--accent,#C8A060);color:#fff;border-radius:100px;padding:13px 28px;font-size:14px;letter-spacing:.04em;font-weight:400;margin-top:4px;cursor:pointer}
.rsub:hover{opacity:.9}
.rok{display:none;text-align:center;padding:16px;font-size:14px;color:var(--accent,#C8A060)}
.rok.show{display:block}

/* ── TIMING SHARED ── */
.timing-row{display:flex;align-items:center;padding:12px 0;border-bottom:1px solid rgba(0,0,0,.06);max-width:420px;margin:0 auto}
.timing-time{font-size:13px;font-weight:300;letter-spacing:.04em;white-space:nowrap}
.timing-label{font-size:14px;font-weight:300;margin-left:auto}

/* ── BRANDING ── */
.fbrand-txt{font-family:'Great Vibes',cursive;font-size:22px}
.fbrand-copy{font-size:11px;letter-spacing:.06em;margin-top:6px}

/* ── RESPONSIVE ── */
@media(max-width:400px){.cd-box{min-width:54px;padding:12px 8px}.cd-num{font-size:24px}}
`;

/* ══════════════════════════════════════════════════════════
   TEMPLATE-SPECIFIC CSS
   ══════════════════════════════════════════════════════════ */
const TEMPLATE_CSS={

blossom:`
.t-blossom{--accent:#C8A060;background:#FDFBF7}
.bl-hero{position:relative;overflow:hidden;min-height:520px;display:flex;align-items:center;justify-content:center}
.bl-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
.bl-hero-no-img{position:absolute;inset:0;background:linear-gradient(135deg,#E8D8F0,#D8C8E8 50%,#C8B8D8);z-index:1}
.bl-hero-overlay{position:absolute;inset:0;background:rgba(0,0,0,.25);z-index:2}
.bl-hero-texture{position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");z-index:3;pointer-events:none}
.bl-flowers{position:absolute;top:8px;left:0;right:0;text-align:center;font-size:clamp(18px,4vw,28px);letter-spacing:.3em;z-index:4;opacity:.7;white-space:nowrap;overflow:hidden}
.bl-angel{position:absolute;z-index:4;font-size:30px;opacity:.45}
.bl-arch{background:rgba(255,255,255,.88);backdrop-filter:blur(8px);border-radius:20px;padding:36px 28px 42px;text-align:center;max-width:340px;width:88%;position:relative;z-index:5;box-shadow:0 8px 32px rgba(0,0,0,.1)}
.bl-arch-eyebrow{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#9080B0;margin-bottom:10px;display:block}
.bl-arch-names{font-family:'Great Vibes',cursive;font-size:clamp(40px,10vw,60px);line-height:1.1;color:#3A2A3A}
.bl-arch-amp{color:#C8A060;margin:0 6px;font-size:.75em;vertical-align:middle}
.bl-arch-date{font-family:'Josefin Sans',sans-serif;font-size:13px;letter-spacing:.12em;margin-top:10px;color:#555}
.bl-arch-tagline{font-size:12px;color:#9080B0;font-style:italic;margin-top:6px}
.bl-sec{padding:40px 24px}
.bl-sec-lav{background:linear-gradient(180deg,#E8D8F0,#D8C8E8);padding:40px 24px;text-align:center}
.bl-sec-dk{background:#3A2A3A;padding:40px 24px;text-align:center;color:rgba(255,255,255,.85)}
.bl-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#9080B0;margin-bottom:8px;display:block}
.bl-label-lt{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.65);margin-bottom:8px;display:block}
.bl-title-lt{font-family:'Great Vibes',cursive;font-size:clamp(28px,6vw,36px);color:rgba(255,255,255,.88);margin-bottom:10px}
.bl-text-lt{font-size:13px;color:rgba(255,255,255,.7);font-weight:300;line-height:1.8}
.bl-text{font-size:14px;color:#555;font-weight:300;line-height:1.85;max-width:380px;margin:0 auto}
.bl-italic{font-style:italic}
.bl-quote{max-width:400px;margin:0 auto;text-align:center}
.bl-quote-text{font-family:'Great Vibes',cursive;font-size:clamp(22px,5vw,30px);color:#3A2A3A;line-height:1.4;margin-bottom:8px}
.bl-quote-src{font-size:12px;color:#9080B0}
.bl-cal-month{font-family:'Great Vibes',cursive;font-size:clamp(22px,5vw,28px);margin-bottom:8px;color:#3A2A3A}
.bl-cal .cal-cell{font-size:12px;color:#5A4A6A}
.bl-cal .cal-cell.active{background:#C8A060;color:#fff}
.bl-cal-wd{text-align:center;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(90,74,106,.5);padding:4px 0}
.bl-cd .cd-box{background:rgba(58,42,58,.08)}
.bl-cd .cd-num{font-family:'Great Vibes',cursive;color:#3A2A3A}
.bl-timing{max-width:420px;margin:0 auto}
.bl-timing-title{font-family:'Great Vibes',cursive;font-size:28px;text-align:center;margin-bottom:16px;color:#3A2A3A}
.bl-cer{text-align:center;max-width:380px;margin:0 auto}
.bl-cer-ico{font-size:36px;margin-bottom:8px;display:block}
.bl-cer-title{font-family:'Great Vibes',cursive;font-size:28px;color:#3A2A3A;margin-bottom:8px}
.bl-cer-name{font-size:16px;font-weight:400;color:#444;margin-bottom:6px}
.bl-cer-time{font-size:13px;color:#888;margin-bottom:6px}
.bl-cer-addr{font-size:13px;color:#999;font-weight:300;line-height:1.7}
.bl-map-btn{display:inline-flex;align-items:center;gap:6px;background:#3A2A3A;color:#fff;padding:10px 20px;border-radius:100px;font-size:12px;letter-spacing:.06em;margin-top:12px;cursor:pointer}
.bl-map-btn:hover{opacity:.9}
.bl-rsvp-sec{background:linear-gradient(180deg,#E8D8F0,#D8C8E8);padding:40px 24px;text-align:center}
.bl-rsvp-title{font-family:'Great Vibes',cursive;font-size:32px;color:#3A2A3A;margin-bottom:8px}
.bl-rsvp-sub{font-size:13px;color:#5A4A6A;font-weight:300;margin-bottom:22px;line-height:1.65}
.bl-rsvp .rf{background:rgba(255,255,255,.6);border-color:rgba(58,42,58,.1);color:#3A2A3A}
.bl-rsvp .rf:focus{border-color:#3A2A3A}
.bl-rsvp .rsub{background:#3A2A3A}
.bl-rsvp .rr-btn{border-color:rgba(58,42,58,.15);color:#5A4A6A}
.bl-rsvp .rr-btn input{accent-color:#3A2A3A}
@media(max-width:400px){.bl-arch{width:88%;padding:36px 20px 46px}}
`,

mono:`
.t-mono{--accent:#A87C3E;background:#FAFAFA;color:#111}
.mn-hero{position:relative;overflow:hidden;height:55vw;max-height:320px}
.mn-hero-img{width:100%;height:100%;object-fit:cover;filter:grayscale(100%)}
.mn-hero-no-img{width:100%;height:100%;background:linear-gradient(135deg,#1a1a1a,#333)}
.mn-hero-text{text-align:center;padding:28px 24px 20px}
.mn-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:#999;margin-bottom:10px}
.mn-names{font-family:'Playfair Display',serif;font-size:clamp(32px,8vw,48px);font-weight:400;line-height:1.1}
.mn-amp{font-family:'Josefin Sans',sans-serif;font-weight:200;font-size:.45em;opacity:.35;margin:0 10px;vertical-align:middle}
.mn-date-frame{display:inline-block;border:1.5px solid #111;padding:6px 18px;font-size:12px;letter-spacing:.18em;margin-top:12px}
.mn-rule{width:40px;height:1px;background:#DDD;margin:0 auto}
.mn-rule-lt{width:40px;height:1px;background:#EEE;margin:0 auto}
.mn-sec{padding:32px 24px}
.mn-sec-dk{background:#111;color:rgba(255,255,255,.85);padding:32px 24px}
.mn-title{font-family:'Playfair Display',serif;font-size:clamp(20px,4vw,26px);font-weight:400;margin-bottom:14px}
.mn-text{font-size:14px;color:#666;font-weight:300;line-height:1.85;max-width:380px;margin:0 auto}
.mn-quote-mark{font-family:'Playfair Display',serif;font-size:clamp(40px,8vw,60px);line-height:.3;color:#CCC;display:block;margin-bottom:10px}
.mn-img-pair{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:0 4px;margin:24px 0}
.mn-img-pair img{width:100%;height:100%;object-fit:cover;aspect-ratio:3/4}
.mn-img-single{padding:0 24px;margin:24px 0}
.mn-img-single img{width:100%;height:56vw;max-height:280px;object-fit:cover}
.mn-cal-month{font-family:'Playfair Display',serif;font-size:clamp(22px,5vw,28px);text-align:center;margin-bottom:8px}
.mn-cal .cal-cell{font-size:12px;color:#555}
.mn-cal .cal-cell.active{background:#111;color:#fff}
.mn-cal-wd{text-align:center;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(0,0,0,.3);padding:4px 0}
.mn-cd .cd-box{background:#111;color:#fff}
.mn-cd .cd-num{font-family:'Playfair Display',serif}
.mn-cer-row{display:flex;align-items:flex-start;gap:14px;margin-bottom:16px;max-width:380px;margin-left:auto;margin-right:auto}
.mn-cer-ico{font-size:20px;opacity:.5}
.mn-cer-lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#888;margin-bottom:2px}
.mn-cer-val{font-family:'Playfair Display',serif;font-size:17px}
.mn-cer-sub{font-size:12px;color:#999;margin-top:3px}
.mn-map-btns{display:flex;justify-content:center;gap:10px;margin-top:12px}
.mn-map-pill{display:inline-flex;align-items:center;gap:6px;background:#111;color:#fff;padding:10px 20px;border-radius:100px;font-size:12px;letter-spacing:.04em}
.mn-rsvp .rf{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08)}
.mn-rsvp .rsub{background:#111}
`,

boho:`
.t-boho{--accent:#A67C52;background:#FDF8F0;color:#3D2E1E}
.bh-hero{position:relative;overflow:hidden}
.bh-hero-img{width:100%;height:85vw;max-height:420px;object-fit:cover;display:block}
.bh-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(61,46,30,.65) 100%)}
.bh-hero-text{position:absolute;bottom:0;left:0;right:0;padding:28px 22px 22px;text-align:center}
.bh-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-bottom:8px}
.bh-names{font-family:'Cormorant Garamond',serif;font-size:clamp(36px,9vw,52px);font-weight:400;line-height:1;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.3)}
.bh-amp{font-family:'Josefin Sans',sans-serif;font-weight:200;font-size:.55em;opacity:.7;margin:0 10px;vertical-align:middle}
.bh-date{font-family:'Josefin Sans',sans-serif;font-size:12px;letter-spacing:.15em;color:rgba(255,255,255,.85);margin-top:10px}
.bh-sec{padding:36px 24px}
.bh-rule{width:40px;height:1px;background:#A67C52;margin:0 auto 28px;opacity:.4}
.bh-title{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,6vw,34px);font-weight:400;margin-bottom:16px;line-height:1.15}
.bh-sub{font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#A67C52;margin-bottom:6px;opacity:.8}
.bh-text{font-size:14px;line-height:1.9;color:#5A4A3A}
.bh-quote{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(17px,3.5vw,22px);line-height:1.7;color:#3D2E1E;text-align:center;padding:20px 0}
.bh-quote-mark{font-size:clamp(40px,8vw,60px);line-height:.3;color:#A67C52;opacity:.25;display:block;margin-bottom:10px}
.bh-quote-source{font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:.1em;color:#A67C52;margin-top:14px;text-transform:uppercase}
.bh-cal-month{font-family:'Cormorant Garamond',serif;font-size:clamp(22px,5vw,30px);text-align:center;margin-bottom:14px;color:#3D2E1E}
.bh-cal .cal-cell{font-size:12px;font-weight:300;color:#5A4A3A}
.bh-cal .cal-cell.active{background:#A67C52;color:#fff;font-weight:500}
.bh-cal-wd{text-align:center;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#A67C52;opacity:.6;padding:4px 0}
.bh-cd .cd-box{background:#3D2E1E;color:#fff;border-radius:10px}
.bh-cd .cd-num{font-family:'Cormorant Garamond',serif;font-size:clamp(24px,5vw,32px)}
.bh-cd .cd-lbl{font-family:'Josefin Sans',sans-serif;font-size:9px;letter-spacing:.12em;text-transform:uppercase;opacity:.55}
.bh-timing .timing-row{border-color:rgba(166,124,82,.15)}
.bh-timing .timing-time{color:#A67C52;font-weight:400}
.bh-timing .timing-label{color:#3D2E1E;font-weight:300}
.bh-cer-ico{font-size:22px;margin-right:14px;opacity:.7}
.bh-cer-lbl{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#A67C52;opacity:.65;margin-bottom:2px}
.bh-cer-val{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:400;color:#3D2E1E}
.bh-cer-sub{font-size:12px;color:#8A7A6A;margin-top:3px;line-height:1.5}
.bh-map-btn{display:inline-flex;align-items:center;gap:6px;background:#3D2E1E;color:#fff;padding:10px 20px;border-radius:100px;font-size:12px;letter-spacing:.06em;margin-top:12px}
.bh-img-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:0 3px}
.bh-img-grid img{width:100%;height:100%;object-fit:cover;aspect-ratio:4/5}
.bh-rsvp{background:#3D2E1E;color:#fff;padding:40px 24px;text-align:center}
.bh-rsvp .bh-title{color:#fff;margin-bottom:8px}
.bh-rsvp .bh-sub{color:rgba(255,255,255,.55)}
.bh-rsvp .rf{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:8px}
.bh-rsvp .rf::placeholder{color:rgba(255,255,255,.4)}
.bh-rsvp .rsub{background:#fff;color:#3D2E1E;border-radius:8px}
.bh-rsvp .rr-btn{color:#fff;border-color:rgba(255,255,255,.25)}
.bh-gifts{background:#F5EFE8;padding:32px 24px;text-align:center}
.bh-footer{padding:28px 24px;text-align:center;background:#F5EFE8}
.bh-footer-logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;color:#A67C52;opacity:.5}
`,

azur:`
.t-azur{--accent:#B8922A;background:#FDFBF7;color:#1A1208}
.az-hero{display:flex;flex-direction:column}
.az-hero-img{width:100%;height:75vw;max-height:380px;object-fit:cover;display:block}
.az-hero-text{padding:28px 24px 20px;text-align:center;background:#FDFBF7}
.az-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#B8922A;margin-bottom:10px}
.az-names{font-family:'Playfair Display',serif;font-size:clamp(30px,7vw,44px);font-weight:400;line-height:1.1;color:#1A1208}
.az-amp{font-family:'Josefin Sans',sans-serif;font-weight:200;font-size:.45em;opacity:.4;margin:0 8px;vertical-align:middle;color:#B8922A}
.az-date{font-family:'Josefin Sans',sans-serif;font-size:12px;letter-spacing:.14em;color:#5A4A3A;margin-top:10px}
.az-sec{padding:32px 24px}
.az-rule{width:48px;height:1px;background:#B8922A;margin:0 auto 24px;opacity:.35}
.az-title{font-family:'Playfair Display',serif;font-size:clamp(24px,5.5vw,32px);font-weight:400;margin-bottom:14px;line-height:1.2;color:#1A1208}
.az-sub{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#B8922A;margin-bottom:8px}
.az-text{font-size:14px;line-height:1.85;color:#4A3A2A}
.az-quote{border-left:2px solid #B8922A;padding:16px 24px;margin:20px 0;font-family:'Playfair Display',serif;font-style:italic;font-size:clamp(15px,3vw,19px);line-height:1.7;color:#4A3A2A;background:rgba(184,146,42,.06)}
.az-quote-source{font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:.1em;color:#B8922A;margin-top:10px;font-style:normal;text-transform:uppercase}
.az-cal-month{font-family:'Playfair Display',serif;font-size:clamp(20px,4.5vw,28px);text-align:center;margin-bottom:12px;color:#1A1208}
.az-cal .cal-cell{font-size:12px;font-weight:300;color:#4A3A2A}
.az-cal .cal-cell.active{background:#B8922A;color:#fff;font-weight:500}
.az-cal-wd{text-align:center;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#B8922A;opacity:.55;padding:4px 0}
.az-cd .cd-box{background:#1A1208;color:#fff;border-radius:10px;min-width:58px}
.az-cd .cd-num{font-family:'Playfair Display',serif;font-size:clamp(22px,4.5vw,30px)}
.az-cd .cd-lbl{font-family:'Josefin Sans',sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;opacity:.5}
.az-timing .timing-row{border-color:rgba(184,146,42,.18);padding:10px 0}
.az-timing .timing-time{color:#B8922A;font-weight:500;min-width:56px;font-size:12.5px}
.az-timing .timing-dot{width:6px;height:6px;background:#B8922A;border-radius:50%;margin:0 12px;flex-shrink:0}
.az-cer-ico{font-size:20px;margin-right:12px;opacity:.6}
.az-cer-lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#B8922A;opacity:.7;margin-bottom:2px}
.az-cer-val{font-family:'Playfair Display',serif;font-size:17px;font-weight:400;color:#1A1208}
.az-cer-sub{font-size:12px;color:#7A6A5A;margin-top:4px;line-height:1.5}
.az-map-btn{display:inline-flex;align-items:center;gap:6px;background:#1A1208;color:#fff;padding:10px 20px;border-radius:100px;font-size:12px;letter-spacing:.05em;margin-top:12px}
.az-img-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:0 4px}
.az-img-grid img{width:100%;height:100%;object-fit:cover;aspect-ratio:3/4}
.az-rsvp{background:#1A1208;color:#fff;padding:36px 24px;text-align:center}
.az-rsvp .az-title{color:#fff;margin-bottom:6px}
.az-rsvp .az-sub{color:rgba(255,255,255,.45)}
.az-rsvp .rf{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:6px}
.az-rsvp .rf::placeholder{color:rgba(255,255,255,.35)}
.az-rsvp .rsub{background:#B8922A;color:#fff;border-radius:6px}
.az-rsvp .rr-btn{color:#fff;border-color:rgba(255,255,255,.2)}
.az-gifts{background:rgba(184,146,42,.08);padding:30px 24px;text-align:center;border:1px solid rgba(184,146,42,.12)}
.az-footer{padding:24px;text-align:center;background:#F5F0EC}
.az-footer-logo{font-family:'Playfair Display',serif;font-size:20px;font-style:italic;color:#B8922A;opacity:.45}
`,

eternal:`
.t-eternal{--accent:#C4A882;background:#F8F5F0;color:#3A2E24}
.et-hero{position:relative;overflow:hidden;height:70vw;max-height:400px}
.et-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.et-hero-no-img{position:absolute;inset:0;background:linear-gradient(135deg,#D8C8B0,#C4A882 50%,#B09060)}
.et-hero-grad{position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(248,245,240,.92) 100%)}
.et-hero-content{position:absolute;bottom:0;left:0;right:0;padding:32px 24px 28px;text-align:center;z-index:2}
.et-date-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#A89078;margin-bottom:8px}
.et-date-stack{display:flex;justify-content:center;align-items:center;gap:6px;font-family:'Playfair Display',serif}
.et-date-num{font-size:clamp(36px,8vw,52px);font-weight:400;color:#3A2E24;line-height:1}
.et-date-dot{color:#C4A882;font-size:24px;opacity:.5}
.et-names{font-family:'Playfair Display',serif;font-size:clamp(26px,6vw,36px);color:#3A2E24;margin-top:8px}
.et-names-amp{color:#C4A882;font-size:.7em;vertical-align:middle;margin:0 6px}
.et-tagline{font-size:13px;color:#7A6858;font-weight:300;margin-top:8px;font-style:italic}
.et-sec{padding:32px 24px;text-align:center}
.et-sec-tan{background:#E8DDD0;padding:32px 24px;text-align:center}
.et-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#A89078;margin-bottom:10px;display:block}
.et-title{font-family:'Playfair Display',serif;font-size:clamp(20px,4vw,26px);font-weight:400;margin-bottom:14px}
.et-text{font-size:14px;color:#5A4A3A;font-weight:300;line-height:1.85;max-width:380px;margin:0 auto}
.et-rule{width:40px;height:1px;background:rgba(196,168,130,.35);margin:20px auto 0}
.et-cal-month{font-family:'Playfair Display',serif;font-size:clamp(20px,4.5vw,28px);text-align:center;margin-bottom:10px}
.et-cal .cal-cell{font-size:12px;color:#5A4A3A}
.et-cal .cal-cell.active{background:#C4A882;color:#fff}
.et-cal-wd{text-align:center;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:#A89078;opacity:.5;padding:4px 0}
.et-big-cd{display:flex;justify-content:center;gap:24px;margin-top:16px}
.et-big-num{font-family:'Playfair Display',serif;font-size:clamp(40px,9vw,60px);color:#3A2E24;line-height:1;display:block}
.et-big-lbl{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#A89078;margin-top:4px;display:block}
.et-arch-portrait{width:42vw;max-width:200px;height:54vw;max-height:260px;object-fit:cover;border-radius:100px 100px 8px 8px}
.et-arch-portrait-lg{width:64vw;max-width:300px;height:44vw;max-height:220px;object-fit:cover;border-radius:8px 8px 100px 100px}
.et-ven-card{background:#fff;border-radius:16px;padding:24px;max-width:360px;margin:0 auto;text-align:left;box-shadow:0 4px 20px rgba(0,0,0,.06)}
.et-ven-ico{font-size:28px;margin-bottom:8px;display:block;text-align:center}
.et-ven-name{font-family:'Playfair Display',serif;font-size:18px;color:#3A2E24;margin-bottom:6px;text-align:center}
.et-ven-time{font-size:13px;color:#888;text-align:center;margin-bottom:6px}
.et-ven-addr{font-size:12px;color:#999;font-weight:300;line-height:1.7;text-align:center}
.et-map-btn{display:inline-flex;align-items:center;gap:6px;background:#3A2E24;color:#fff;padding:10px 20px;border-radius:100px;font-size:12px;letter-spacing:.04em;margin-top:12px}
.et-rsvp-sec{background:#3A2E24;color:#fff;padding:40px 24px;text-align:center}
.et-rsvp-title{font-family:'Playfair Display',serif;font-size:28px;margin-bottom:8px}
.et-rsvp-sub{font-size:13px;color:rgba(255,255,255,.6);font-weight:300;margin-bottom:22px;line-height:1.65}
.et-rsvp .rf{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#fff}
.et-rsvp .rf::placeholder{color:rgba(255,255,255,.4)}
.et-rsvp .rsub{background:#C4A882;color:#3A2E24}
.et-rsvp .rr-btn{color:#fff;border-color:rgba(255,255,255,.25)}
@media(max-width:400px){.et-big-num{font-size:36px}}
`,

verde:`
.t-verde{--accent:#7A8E6A;background:#F2F4EE;color:#2A3020}
.vd-hero-img-wrap{position:relative;height:65vw;max-height:360px;overflow:hidden}
.vd-hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(242,244,238,.85) 100%)}
.vd-hero-no-img{position:absolute;inset:0;background:linear-gradient(135deg,#4A5E40,#7A8E6A)}
.vd-hero-top-text{position:absolute;top:0;left:0;right:0;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start;z-index:2}
.vd-hero-date-top{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.15em;color:rgba(255,255,255,.85);text-shadow:0 1px 4px rgba(0,0,0,.3)}
.vd-hero-name-top{font-family:'Cormorant Garamond',serif;font-size:clamp(16px,3.5vw,20px);color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.3);font-style:italic}
.vd-names-card{background:#fff;border-radius:16px;padding:28px 24px;text-align:center;margin:-40px 24px 24px;position:relative;z-index:3;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.vd-eyebrow{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#7A8E6A;margin-bottom:10px;display:block}
.vd-names{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,7vw,44px);font-weight:400;line-height:1.2;color:#2A3020}
.vd-names-amp{color:#7A8E6A;font-size:.65em;vertical-align:middle;margin:0 6px}
.vd-date{font-family:'Josefin Sans',sans-serif;font-size:12px;letter-spacing:.12em;color:#7A8E6A;margin-top:10px}
.vd-sec{padding:32px 24px;text-align:center}
.vd-sec-green{background:#4A5E40;color:rgba(255,255,255,.88);padding:36px 24px;text-align:center}
.vd-sec-cream{background:#E8EADE;padding:32px 24px;text-align:center}
.vd-sec-white{background:#fff;padding:32px 24px;text-align:center}
.vd-rule{width:40px;height:1px;background:rgba(122,142,106,.25);margin:20px auto 0}
.vd-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7A8E6A;margin-bottom:10px;display:block}
.vd-label-lt{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-bottom:10px;display:block}
.vd-title{font-family:'Cormorant Garamond',serif;font-size:clamp(22px,5vw,30px);font-weight:400;margin-bottom:14px}
.vd-text{font-size:14px;color:#5A6850;font-weight:300;line-height:1.85;max-width:380px;margin:0 auto}
.vd-photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 6px;margin:24px 0}
.vd-photo-cell{border-radius:12px;overflow:hidden;aspect-ratio:1}
.vd-photo-cell img{width:100%;height:100%;object-fit:cover}
.vd-timing-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:8px;display:block}
.vd-timing-title{font-family:'Cormorant Garamond',serif;font-size:clamp(22px,5vw,28px);margin-bottom:16px;color:#fff}
.vd-timing-row{display:flex;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);max-width:360px;margin:0 auto}
.vd-timing-time{font-size:13px;font-weight:300;letter-spacing:.06em;color:rgba(255,255,255,.7);min-width:60px}
.vd-timing-event{font-size:14px;font-weight:300;color:#fff;margin-left:auto}
.vd-cal-month{font-family:'Cormorant Garamond',serif;font-size:clamp(22px,5vw,28px);margin-bottom:10px;color:#fff}
.vd-cal .cal-cell{font-size:12px;color:rgba(255,255,255,.7)}
.vd-cal .cal-cell.active{background:rgba(255,255,255,.2);color:#fff}
.vd-cal-wd{text-align:center;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);padding:4px 0}
.vd-cd .cd-box{background:rgba(255,255,255,.1);color:#fff;border-radius:10px}
.vd-cd .cd-num{font-family:'Cormorant Garamond',serif}
.vd-cer-card{display:flex;align-items:flex-start;gap:16px;background:#F2F4EE;border-radius:12px;padding:18px;max-width:380px;margin:0 auto;text-align:left}
.vd-cer-ico-wrap{font-size:28px;width:48px;height:48px;background:#4A5E40;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.vd-cer-lbl{font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#7A8E6A;margin-bottom:2px}
.vd-cer-name{font-family:'Cormorant Garamond',serif;font-size:18px;color:#2A3020}
.vd-cer-time{font-size:13px;color:#888;margin-top:4px}
.vd-cer-addr{font-size:12px;color:#999;font-weight:300;line-height:1.7;margin-top:4px}
.vd-map-btn{display:inline-flex;align-items:center;gap:6px;background:#4A5E40;color:#fff;padding:10px 20px;border-radius:100px;font-size:12px;letter-spacing:.04em;margin-top:12px}
.vd-rsvp-sec{background:#4A5E40;padding:40px 24px}
.vd-rsvp-arch{background:#F2F4EE;border-radius:16px;padding:28px 24px;text-align:center}
.vd-rsvp-title{font-family:'Cormorant Garamond',serif;font-size:28px;color:#2A3020;margin:8px 0}
.vd-rsvp-sub{font-size:13px;color:#5A6850;font-weight:300;margin-bottom:22px;line-height:1.65}
.vd-rsvp .rf{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08)}
.vd-rsvp .rsub{background:#4A5E40;color:#fff}
.vd-rsvp .rr-btn{color:#5A6850;border-color:rgba(0,0,0,.12)}
`,

floral:`
.t-floral{--accent:#7A8E6A;background:#fff;color:#2A2A2A}
.fl-hero{position:relative}
.fl-hero-img-wrap{position:relative;height:55vw;max-height:300px;overflow:hidden}
.fl-hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.fl-hero-no-img{position:absolute;inset:0;background:linear-gradient(135deg,#D8E8D0,#A8C8A0 50%,#88B080)}
.fl-leaf-top{position:absolute;top:12px;left:0;right:0;padding:0 16px;display:flex;justify-content:space-between;z-index:2}
.fl-leaf-tl,.fl-leaf-tr{font-size:24px;opacity:.4}
.fl-leaf-tr{transform:scaleX(-1)}
.fl-hero-text{text-align:center;padding:28px 24px 20px}
.fl-label{font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#7A8E6A;margin-bottom:10px;display:block}
.fl-names{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,7vw,44px);font-weight:400;line-height:1.15}
.fl-amp{color:#7A8E6A;font-size:.55em;vertical-align:middle;margin:0 8px}
.fl-date{font-family:'Josefin Sans',sans-serif;font-size:12px;letter-spacing:.14em;color:#999;margin-top:10px}
.fl-rule{width:40px;height:1px;background:#F0F0EC;margin:0 auto}
.fl-sec{padding:32px 24px;text-align:center}
.fl-sec-gray{background:#F8F9F6;padding:32px 24px;text-align:center}
.fl-title{font-family:'Cormorant Garamond',serif;font-size:clamp(20px,4vw,26px);font-weight:400;margin-bottom:14px}
.fl-text{font-size:14px;color:#666;font-weight:300;line-height:1.85;max-width:380px;margin:0 auto}
.fl-quote{max-width:380px;margin:0 auto;text-align:center}
.fl-quote-text{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(17px,3.5vw,22px);color:#2A2A2A;line-height:1.72;margin-bottom:10px}
.fl-quote-src{font-size:12px;color:#7A8E6A}
.fl-journey{max-width:380px;margin:0 auto;text-align:left}
.fl-journey-row{display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #F0F0EC}
.fl-j-time{font-size:13px;font-weight:300;letter-spacing:.06em;color:#7A8E6A;min-width:64px}
.fl-j-event{font-size:14px;font-weight:300;color:#444;margin-left:auto}
.fl-cal-month{font-family:'Cormorant Garamond',serif;font-size:clamp(22px,5vw,28px);text-align:center;margin-bottom:10px}
.fl-cal .cal-cell{font-size:12px;color:#555}
.fl-cal .cal-cell.active{background:#7A8E6A;color:#fff}
.fl-cal-wd{text-align:center;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(122,142,106,.5);padding:4px 0}
.fl-cd-wrap{background:#F8F9F6;border-radius:16px;padding:24px;text-align:center;position:relative;overflow:hidden}
.fl-cd-bg{position:absolute;top:-20px;right:-20px;font-size:100px;opacity:.04;pointer-events:none}
.fl-cd-title{font-family:'Cormorant Garamond',serif;font-size:20px;color:#2A2A2A;margin-bottom:16px;position:relative}
.fl-cd .cd-box{background:rgba(122,142,106,.08)}
.fl-cd .cd-num{font-family:'Cormorant Garamond',serif;color:#2A2A2A}
.fl-cer-line{display:flex;align-items:flex-start;gap:14px;text-align:left;max-width:380px;margin:0 auto}
.fl-cer-line-ico{font-size:24px;opacity:.5}
.fl-cer-line-lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#7A8E6A;margin-bottom:2px}
.fl-cer-line-val{font-family:'Cormorant Garamond',serif;font-size:18px;color:#2A2A2A}
.fl-cer-line-sub{font-size:12px;color:#999;margin-top:3px}
.fl-map-btns{display:flex;justify-content:center;gap:10px;margin-top:12px}
.fl-map-pill{display:inline-flex;align-items:center;gap:6px;background:#7A8E6A;color:#fff;padding:10px 20px;border-radius:100px;font-size:12px;letter-spacing:.04em}
.fl-rsvp-sec{background:#F8F9F6;padding:36px 24px;text-align:center}
.fl-rsvp-title{font-family:'Cormorant Garamond',serif;font-size:28px;color:#2A2A2A;margin-bottom:8px}
.fl-rsvp-sub{font-size:13px;color:#666;font-weight:300;margin-bottom:22px;line-height:1.65}
.fl-rsvp .rf{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08)}
.fl-rsvp .rsub{background:#7A8E6A;color:#fff}
.fl-rsvp .rr-btn{color:#666;border-color:rgba(0,0,0,.1)}
.fl-dress-dots{display:flex;justify-content:center;gap:12px;margin-top:16px}
.fl-dot{width:24px;height:24px;border-radius:50%}
`
};

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT: generateInvitationHTML
   Returns a complete HTML document string
   ══════════════════════════════════════════════════════════ */
function generateInvitationHTML(inv,gallery){
  const bodyHTML = renderBody(inv,gallery);
  const templateCSS = TEMPLATE_CSS[inv.font_preset] || TEMPLATE_CSS.floral;
  const title = (inv.host_name_1||'') + (inv.host_name_2?' & ' + inv.host_name_2:'') + ' — Festlich';
  const cdScript = countdownScript(inv.event_date, inv.event_time);

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@200;300;400;500;600&family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Sacramento&display=swap" rel="stylesheet">
<style>${SHARED_CSS}${templateCSS}</style>
</head>
<body>
<div id="invitation" class="active">${bodyHTML}</div>
${cdScript}
</body>
</html>`;
}

/* ── Export to global scope ── */
global.FestlichRenderer = {
  generateInvitationHTML: generateInvitationHTML,
  renderBody: renderBody,
  renderBlossom: renderBlossom,
  renderMono: renderMono,
  renderBoho: renderBoho,
  renderAzur: renderAzur,
  renderEternal: renderEternal,
  renderVerde: renderVerde,
  renderFloral: renderFloral,
  fmtShort: fmtShort,
  fmtLong: fmtLong,
  dateParts: dateParts,
  buildCal: buildCal,
  SHARED_CSS: SHARED_CSS,
  TEMPLATE_CSS: TEMPLATE_CSS
};

})(typeof window!=='undefined'?window:typeof global!=='undefined'?global:this);
