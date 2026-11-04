const $ = s => document.querySelector(s);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const escapeText = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortDate = value => new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${value}T12:00:00`));
let photos = [
 { id:'lake', src:'assets/photo-0.jpg', title:'Where the water meets the sky', date:'2026-10-25', places:['life','time'] },
 { id:'coffee', src:'assets/photo-1.jpg', title:'An afternoon over coffee', date:'2026-11-02', places:['life','time'] },
 { id:'flowers', src:'assets/photo-7.jpg', title:'Flowers along the way', date:'2026-11-01', places:['life','time'] },
 { id:'sea', src:'assets/photo-2.jpg', title:'A little time by the sea', date:'2026-10-18', places:['life','time'] },
 { id:'dog', src:'assets/photo-3.jpg', title:'Another day beside you', date:'2026-10-12', places:['life','time'] },
 { id:'night', src:'assets/photo-6.jpg', title:'The long way home', date:'2026-10-09', places:['life','time'] },
 { id:'me', src:'assets/photo-4.jpg', title:'A small treat for myself', date:'2026-09-28', places:['life','time'] },
 { id:'mountains', src:'assets/photo-5.jpg', title:'Mountains, close to the heart', date:'2026-09-17', places:['life','time'] }
];
// Fictional capture dates/times demonstrate several moments on the same day.
['09:24','15:32','11:06','17:45','10:18','20:42','14:30','08:16'].forEach((time,i)=>photos[i].time=time);
const extraPhotoTitles=[
 'The road ahead','A breeze on the summit','Slow steps through the woods','The quiet of first light',
 'My first glimpse of the stars','A letter in lake blue','A view around every bend','Across a quiet bridge',
 'Morning in the valley','A little longer before sunset','Looking up, just in time','The city after rain',
 'The city across the water','Waiting for sunset together','Seeing myself a little clearer','Talking until the evening fades',
 'Dressed for a good day','A home in a cardboard box','Our little observer','Happiness on the run',
 'A well-earned head pat','Coffee with the houseplants','A table full of favorites','Watching the coffee drip',
 'My first cup of the day','Breakfast, made with care','All the colors of lunch','A little kitchen ritual',
 'A good meal, a little care','Bringing flowers home'
];
const extraTimes=[['07:12','08:08','09:35','11:20','12:46','14:18','17:32','21:16'],['06:18','07:22','09:04','12:33','15:20','17:40','18:12','20:31'],['08:10','09:25','10:46','12:10','14:38','16:05','18:22','21:40'],['08:30','10:15','12:24','15:12','18:45','20:08']];
extraPhotoTitles.forEach((title,i)=>{
  const group=Math.floor(i/8), dates=['2026-11-03','2026-11-02','2026-11-01','2026-10-31'];
  photos.push({id:`extra-${i+8}`,src:`assets/photo-${i+8}.jpg`,title,date:dates[group],time:extraTimes[group][i%8],places:['life','time']});
});
let page = 'home', toastTimeout;
function toast(message) { $('#toast-message').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').hidden = true, 3000); }

// Magnetic button: measure the stationary hit area, never the moving button.
const magnet = { x:0, y:0, tx:0, ty:0, tween:null, raf:0, rect:null };
function easeOutElastic(t) { if (t === 0 || t === 1) return t; return Math.pow(2, -10*t) * Math.sin((t*10 - .75) * (2*Math.PI/3)) + 1; }
function paintMagnet() { $('#magnet-button').style.transform = `translate3d(${magnet.x}px,${magnet.y}px,0)`; $('#magnet-text').style.transform = `translate3d(${magnet.tx}px,${magnet.ty}px,0)`; }
function tweenMagnet(x,y,tx,ty,returning=false) {
  if (reducedMotion.matches || !finePointer.matches) return;
  // Tracking belongs to the pointer: never restart a long easing on each mousemove.
  // Cancel any return animation so re-entering immediately takes control again.
  if (!returning) {
    cancelAnimationFrame(magnet.raf); magnet.raf=0; magnet.tween=null;
    [magnet.x,magnet.y,magnet.tx,magnet.ty]=[x,y,tx,ty]; paintMagnet();
    return;
  }
  magnet.tween = { from:[magnet.x,magnet.y,magnet.tx,magnet.ty], to:[x,y,tx,ty], start:performance.now(), duration:780 };
  if (!magnet.raf) magnet.raf = requestAnimationFrame(tickMagnet);
}
function tickMagnet(now) {
  magnet.raf=0; const tween=magnet.tween;
  if (!tween || page!=='home' || document.hidden) return;
  const t=clamp((now-tween.start)/tween.duration,0,1), ease=easeOutElastic(t);
  [magnet.x,magnet.y,magnet.tx,magnet.ty]=tween.from.map((v,i)=>v+(tween.to[i]-v)*ease); paintMagnet();
  if (t<1) magnet.raf=requestAnimationFrame(tickMagnet); else magnet.tween=null;
}
$('#magnet-zone').addEventListener('mouseenter',()=>magnet.rect=$('#magnet-zone').getBoundingClientRect());
$('#magnet-zone').addEventListener('mousemove',event=>{
  if (page!=='home' || $('#upload-dialog').open) return;
  const rect=magnet.rect||$('#magnet-zone').getBoundingClientRect();
  const dx=event.clientX-(rect.left+rect.width/2), dy=event.clientY-(rect.top+rect.height/2);
  // Button moves 0.3 × pointer displacement. Text adds 0.16 × on top: total 0.46 ×.
  tweenMagnet(dx*.3,dy*.3,dx*.16,dy*.16);
});
$('#magnet-zone').addEventListener('mouseleave',()=>tweenMagnet(0,0,0,0,true));
$('#magnet-button').addEventListener('blur',()=>tweenMagnet(0,0,0,0,true));

// The photo wheel is a ring of real DOM photos. Pointer position controls angular speed.
let wheelItems=[], wheelAngle=0, wheelVelocity=0, wheelRaf=0, wheelLast=0, wheelTween=null, wheelRect=null, activePhoto=-1;
function stopWheel(){wheelVelocity=0;wheelTween=null;$('#wheel-motion').textContent='Stay a while';$('#mouse-marker').style.transform='translateX(0px)';$('#center-pause').style.opacity='.65';}
function buildWheel(){
  wheelItems=photos.filter(p=>p.places.includes('life'));
  $('#wheel-photos').innerHTML=wheelItems.map(p=>`<button class="wheel-card" data-photo="${escapeText(p.id)}" aria-label="View photo: ${escapeText(p.title)}"><img src="${escapeText(p.src)}" alt="${escapeText(p.title)}" draggable="false"><span class="wheel-card-caption"><strong>${escapeText(p.title)}</strong><small>${new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short'}).format(new Date(`${p.date}T12:00:00`))}</small></span></button>`).join('');
  $('#wheel-total').textContent=String(wheelItems.length).padStart(2,'0');$('#wheel-empty').hidden=!!wheelItems.length;activePhoto=-1;paintWheel();
}
function wheelStep(){return 360/Math.max(1,wheelItems.length);}
function paintWheel(){
  if(!wheelItems.length)return;
  const width=$('#wheel-stage').clientWidth, cards=$('#wheel-photos').children;
  // Keep neighboring frames separated as the collection grows from 8 to 38+ photos.
  const cardWidth=cards[0]?.offsetWidth||275;
  const radius=Math.max(clamp(width*.43,285,650),(cardWidth+35)/(2*Math.sin(Math.PI/Math.max(3,cards.length))));
  for(let i=0;i<cards.length;i++){
    const degrees=((wheelAngle+i*wheelStep()+180)%360+360)%360-180, radians=degrees*Math.PI/180, cosine=Math.cos(radians);
    const x=Math.sin(radians)*radius, y=(1-cosine)*-22, z=(cosine-1)*radius;
    cards[i].style.transform=`translate3d(${x}px,${y}px,${z}px) rotateY(${-degrees*.34}deg) rotateZ(${-Math.sin(radians)*4}deg)`;
    const opacity=cosine<=.03?0:clamp((cosine-.03)/.97,.04,1);
    cards[i].style.opacity=opacity;cards[i].style.pointerEvents=opacity>.18?'auto':'none';cards[i].tabIndex=reducedMotion.matches||opacity>.18?0:-1;
  }
  const nearest=((Math.round(-wheelAngle/wheelStep())%wheelItems.length)+wheelItems.length)%wheelItems.length;
  if(nearest!==activePhoto){activePhoto=nearest;const current=wheelItems[nearest];$('#wheel-index').textContent=String(nearest+1).padStart(2,'0');$('#wheel-caption').textContent=current.title;$('#wheel-date').textContent=`${shortDate(current.date)} · ${current.time||'12:00'}`;}
}
function requestWheel(){if(!wheelRaf)wheelRaf=requestAnimationFrame(tickWheel);}
function tickWheel(now){
  wheelRaf=0;if(page!=='life'||document.hidden||$('#lightbox').open||$('#upload-dialog').open){wheelLast=0;return;}
  const dt=wheelLast?Math.min((now-wheelLast)/1000,.04):0;wheelLast=now;
  if(wheelTween){const t=clamp((now-wheelTween.start)/600,0,1), ease=1-Math.pow(1-t,3);wheelAngle=wheelTween.from+(wheelTween.to-wheelTween.from)*ease;if(t>=1)wheelTween=null;}
  else wheelAngle+=wheelVelocity*dt;
  // Keep angles numerically stable during long browsing sessions.
  if(Math.abs(wheelAngle)>36000)wheelAngle%=360;
  paintWheel();if(wheelVelocity!==0||wheelTween)requestWheel();else wheelLast=0;
}
$('#wheel-stage').addEventListener('mouseenter',()=>wheelRect=$('#wheel-stage').getBoundingClientRect());
$('#wheel-stage').addEventListener('mousemove',event=>{
  if(page!=='life'||reducedMotion.matches||!finePointer.matches||$('#lightbox').open||$('#upload-dialog').open)return;
  const rect=wheelRect||$('#wheel-stage').getBoundingClientRect();const normalized=clamp((event.clientX-(rect.left+rect.width/2))/(rect.width/2),-1,1);
  const deadZone=.17;
  if(Math.abs(normalized)<=deadZone){stopWheel();return;}
  wheelTween=null;wheelVelocity=-Math.sign(normalized)*((Math.abs(normalized)-deadZone)/(1-deadZone))*46*(wheelStep()/45);
  $('#wheel-motion').textContent=normalized<0?'Turning left':'Turning right';$('#mouse-marker').style.transform=`translateX(${normalized*85}px)`;$('#center-pause').style.opacity='0';requestWheel();
});
$('#wheel-stage').addEventListener('mouseleave',stopWheel);
$('#wheel-stage').addEventListener('focusin',stopWheel);
function stepWheel(direction){
  if(!wheelItems.length)return;stopWheel();
  if(reducedMotion.matches){activePhoto=((activePhoto+direction)%wheelItems.length+wheelItems.length)%wheelItems.length;const card=$('#wheel-photos').children[activePhoto];$('#wheel-stage').scrollTo({left:card.offsetLeft-25,behavior:'instant'});const photo=wheelItems[activePhoto];$('#wheel-index').textContent=String(activePhoto+1).padStart(2,'0');$('#wheel-caption').textContent=photo.title;$('#wheel-date').textContent=shortDate(photo.date);return;}
  wheelTween={from:wheelAngle,to:Math.round(wheelAngle/wheelStep())*wheelStep()-direction*wheelStep(),start:performance.now()};requestWheel();
}
$('#wheel-prev').addEventListener('click',()=>stepWheel(-1));$('#wheel-next').addEventListener('click',()=>stepWheel(1));
$('#wheel-stage').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stepWheel(event.key==='ArrowRight'?1:-1);}});

// Timeline: native page scrolling owns the camera, rather than an autoplay animation.
let timeItems=[], timeSegments=[], timeFrames=[], camera=0, cameraTarget=0, timeRaf=0, timePairs=1, lastTimePair=-1;
const dateLabel=date=>shortDate(date);
function buildCorridor(){
  timeItems=photos.filter(p=>p.places.includes('time')).sort((a,b)=>`${b.date}T${b.time||'00:00'}`.localeCompare(`${a.date}T${a.time||'00:00'}`));
  const days=new Map();timeItems.forEach(photo=>{if(!days.has(photo.date))days.set(photo.date,[]);days.get(photo.date).push(photo);});
  timeSegments=[];timeFrames=[];
  for(const [date,dayPhotos] of days){
    for(let offset=0;offset<dayPhotos.length;offset+=2){
      const row=timeSegments.length, slice=dayPhotos.slice(offset,offset+2);
      timeSegments.push({date,offset,total:dayPhotos.length,photos:slice});
      slice.forEach((photo,side)=>timeFrames.push({photo,row,side,ordinal:offset+side+1,total:dayPhotos.length}));
    }
  }
  timePairs=Math.max(1,timeSegments.length);
  $('#corridor-frames').innerHTML=timeFrames.map(({photo:p,ordinal,total})=>`<button class="corridor-frame" data-photo="${escapeText(p.id)}" aria-label="${dateLabel(p.date)} ${p.time||'12:00'}, ${escapeText(p.title)}"><img src="${escapeText(p.src)}" alt="${escapeText(p.title)}" draggable="false"><time class="frame-stamp" datetime="${p.date}T${p.time||'12:00'}"><b>${p.time||'12:00'}</b><small>Moment ${ordinal} / ${total}</small></time><span class="frame-caption"><strong>${escapeText(p.title)}</strong><small>${shortDate(p.date)} · ${p.time||'12:00'}</small></span></button>`).join('');
  $('#date-jump').innerHTML=Array.from(days,([date,list])=>`<option value="${date}">${dateLabel(date)} · ${list.length} ${list.length===1?'moment':'moments'}</option>`).join('');
  fitCorridor();lastTimePair=-1;paintCorridor();
}
function fitCorridor(){const viewHeight=Math.max(600,innerHeight-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')));$('#time-page').style.height=`${viewHeight+Math.max(1,timePairs-1)*1150}px`;}
function timeProgress(){const travel=$('#time-page').offsetHeight-$('#corridor-window').offsetHeight;return clamp(scrollY/Math.max(1,travel),0,1);}
function onTimeScroll(){if(page!=='time')return;const progress=timeProgress();cameraTarget=progress*Math.max(0,timePairs-1)*800;$('#time-progress').value=Math.round(progress*1000);$('#scroll-invitation').style.opacity=progress>.025?'0':'1';if(reducedMotion.matches){camera=cameraTarget;paintCorridor();}else if(!timeRaf)timeRaf=requestAnimationFrame(tickCorridor);}
function tickCorridor(){timeRaf=0;if(page!=='time'||document.hidden)return;camera+=(cameraTarget-camera)*.13;if(Math.abs(cameraTarget-camera)<.15)camera=cameraTarget;paintCorridor();if(camera!==cameraTarget)timeRaf=requestAnimationFrame(tickCorridor);}
function paintCorridor(){
  const width=$('#corridor-window').clientWidth, side=width<700?width*.355:clamp(width*.335,260,650), frames=$('#corridor-frames').children;
  for(let i=0;i<frames.length;i++){
    const {row,side:frameSide}=timeFrames[i], sign=frameSide===0?-1:1, z=camera-row*800-180;
    const opacity=z>180?clamp(1-(z-180)/210,0,1):clamp(1+z/4200,.09,1);
    const visible=z<390&&z>-4500;
    frames[i].style.transform=`translate3d(${sign*side}px,${(row%2===0?0:-24)}px,${z}px) rotateY(${-sign*17}deg)`;
    frames[i].style.opacity=visible?opacity:0;frames[i].style.pointerEvents=visible&&opacity>.3?'auto':'none';frames[i].tabIndex=visible&&opacity>.3?0:-1;
  }
  const pair=clamp(Math.round(camera/800),0,timePairs-1);
  if(pair!==lastTimePair){
    lastTimePair=pair;const segment=timeSegments[pair];
    if(segment){
      const date=segment.date, weekday=new Intl.DateTimeFormat('en-GB',{weekday:'long'}).format(new Date(`${date}T12:00:00`));
      $('#corridor-month').textContent=new Intl.DateTimeFormat('en-GB',{month:'short',day:'2-digit'}).format(new Date(`${date}T12:00:00`));
      $('#corridor-year').textContent=`${date.slice(0,4)} · ${weekday}`;
      const end=segment.offset+segment.photos.length, range=end===segment.offset+1?`${end}`:`${segment.offset+1}–${end}`;
      $('#corridor-day-count').textContent=`${segment.total} ${segment.total===1?'moment':'moments'} · Viewing ${range}`;
      $('#date-jump').value=date;
    }else{$('#corridor-month').textContent='To be continued';$('#corridor-year').textContent='Your first moment';$('#corridor-day-count').textContent='';}
    $('#time-counter').textContent=`${String(pair+1).padStart(2,'0')} / ${String(timePairs).padStart(2,'0')} groups · ${timeItems.length} photos`;
  }
}
addEventListener('scroll',onTimeScroll,{passive:true});
$('#time-progress').addEventListener('input',event=>{const travel=$('#time-page').offsetHeight-$('#corridor-window').offsetHeight;scrollTo({top:Number(event.target.value)/1000*travel,behavior:'instant'});});
$('#date-jump').addEventListener('change',event=>{
  const index=timeSegments.findIndex(segment=>segment.date===event.target.value);if(index<0)return;
  // Land at the first moments of the chosen day, without showing intermediate dates.
  const land=()=>{
    const travel=$('#time-page').offsetHeight-$('#corridor-window').offsetHeight;
    camera=cameraTarget=index*800;lastTimePair=-1;
    scrollTo({top:index/Math.max(1,timePairs-1)*travel,behavior:'instant'});
    paintCorridor();onTimeScroll();
  };
  land();requestAnimationFrame(land);
});
$('#corridor-window').addEventListener('keydown',event=>{if(['INPUT','SELECT'].includes(event.target.tagName))return;if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key)){event.preventDefault();if(event.key==='Home')scrollTo({top:0,behavior:'instant'});else if(event.key==='End')scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});else scrollBy({top:(event.key==='ArrowUp'||event.key==='PageUp'?-1:1)*innerHeight*.55,behavior:reducedMotion.matches?'instant':'smooth'});}});

// Photo addition is a dialog, not a fourth page. Each photo has an explicit destination.
let selectedPhotos=[], pendingSelection=0;
function today(){const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function clearSelection(){selectedPhotos.forEach(p=>{if(p.temporary)URL.revokeObjectURL(p.src);});selectedPhotos=[];}
function openUpload(){
  stopWheel();tweenMagnet(0,0,0,0,true);clearSelection();pendingSelection++;
  $('#upload-form').reset();$('#photo-input').value='';$('#photo-date').value=today();$('#photo-time').value=new Date().toTimeString().slice(0,5);$('#photo-error').textContent='';$('#date-error').textContent='';$('#drop-area').hidden=false;$('#upload-preview').hidden=true;$('#save-photo').disabled=false;$('#upload-dialog').showModal();
}
function closeUpload(){if($('#close-upload').disabled)return;pendingSelection++;clearSelection();$('#upload-dialog').close();}
$('#magnet-button').addEventListener('click',openUpload);document.querySelectorAll('[data-upload]').forEach(b=>b.addEventListener('click',openUpload));$('#close-upload').addEventListener('click',closeUpload);
$('#upload-dialog').addEventListener('cancel',event=>{if($('#close-upload').disabled){event.preventDefault();return;}pendingSelection++;clearSelection();});
$('#drop-area').addEventListener('click',()=>$('#photo-input').click());$('#replace-photo').addEventListener('click',()=>$('#photo-input').click());
function showSelection(){if(!selectedPhotos.length)return;$('#upload-image').src=selectedPhotos[0].src;$('#upload-count').textContent=`${selectedPhotos.length} ${selectedPhotos.length===1?'photo':'photos'} selected`;$('#drop-area').hidden=true;$('#upload-preview').hidden=false;}
async function acceptFiles(files){
  const selectionToken=++pendingSelection, candidates=Array.from(files);if(!candidates.length)return;
  if(candidates.length>12){$('#photo-error').textContent='Choose up to 12 photos at a time.';return;}
  if(candidates.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024)){$('#photo-error').textContent='Use JPG, PNG or WebP files, up to 10 MB each.';return;}
  $('#save-photo').disabled=true;$('#photo-error').textContent='Reading your photos…';const accepted=[];
  try{
    for(const file of candidates){const src=URL.createObjectURL(file);const img=new Image();try{img.src=src;await img.decode();}catch{URL.revokeObjectURL(src);throw Error('A photo could not be read. Please choose another.');}accepted.push({src,blob:file,temporary:true});}
    if(selectionToken!==pendingSelection||!$('#upload-dialog').open){accepted.forEach(p=>URL.revokeObjectURL(p.src));return;}
    clearSelection();selectedPhotos=accepted;$('#photo-error').textContent='';showSelection();
  }catch(error){accepted.forEach(p=>URL.revokeObjectURL(p.src));if(selectionToken===pendingSelection)$('#photo-error').textContent=error.message;}
  finally{if(selectionToken===pendingSelection)$('#save-photo').disabled=false;}
}
$('#photo-input').addEventListener('change',event=>acceptFiles(event.target.files));
['dragenter','dragover'].forEach(name=>$('#drop-area').addEventListener(name,event=>{event.preventDefault();$('#drop-area').classList.add('dragover');}));
['dragleave','drop'].forEach(name=>$('#drop-area').addEventListener(name,event=>{event.preventDefault();$('#drop-area').classList.remove('dragover');if(name==='drop')acceptFiles(event.dataTransfer.files);}));
$('#use-example').addEventListener('click',()=>{pendingSelection++;clearSelection();selectedPhotos=[{src:'assets/photo-7.jpg',temporary:false}];$('#save-photo').disabled=false;$('#photo-error').textContent='';showSelection();});
$('#upload-form').addEventListener('submit',async event=>{
  event.preventDefault();let valid=true;
  if($('#save-photo').disabled)return;
  if(!selectedPhotos.length){$('#photo-error').textContent='Choose a photo, or try the example.';$('#drop-area').focus();valid=false;}
  if(!$('#photo-date').value||!$('#photo-date').validity.valid||!$('#photo-time').value||!$('#photo-time').validity.valid){$('#date-error').textContent='Please choose a valid date and time.';valid=false;}else $('#date-error').textContent='';
  if(!valid)return;
  const destination=new FormData($('#upload-form')).get('destination');if(!['life','time','both'].includes(destination))return;
  const places=destination==='both'?['life','time']:[destination], title=$('#photo-title').value.trim()||'A moment worth keeping', date=$('#photo-date').value,time=$('#photo-time').value;
  const createdAt=Date.now();
  const additions=selectedPhotos.map((photo,i)=>({id:`moment-${crypto.randomUUID()}`,src:photo.src,blob:photo.blob,createdAt:createdAt+i,date,time,title:selectedPhotos.length>1?`${title} · ${i+1}`:title,places:[...places]}));
  $('#save-photo').disabled=true;$('#close-upload').disabled=true;
  try{await momentStorage.add(additions.map(({src,...photo})=>photo.blob?photo:{...photo,src}));}
  catch{$('#photo-error').textContent='Could not save. Browser storage may be full or disabled. Keep your originals and try again.';return;}
  finally{$('#save-photo').disabled=false;$('#close-upload').disabled=false;}
  photos.unshift(...additions);selectedPhotos=[];pendingSelection++;$('#upload-dialog').close();wheelAngle=0;camera=0;cameraTarget=0;stopWheel();buildWheel();buildCorridor();
  const next=destination==='time'?'time':'life';if(location.hash===`#${next}`)showPage();else location.hash=next;
  toast(`Saved ${additions.length} ${additions.length===1?'photo':'photos'} to ${destination==='both'?'My Life and Time Trail':destination==='time'?'Time Trail':'My Life'}.`);
});
document.addEventListener('click',event=>{const button=event.target.closest('[data-photo]');if(!button)return;const photo=photos.find(p=>p.id===button.dataset.photo);if(!photo)return;stopWheel();$('#lightbox-image').src=photo.src;$('#lightbox-image').alt=photo.title;$('#lightbox-title').textContent=photo.title;$('#lightbox-date').textContent=`${shortDate(photo.date)} · ${photo.time||'12:00'}`;$('#lightbox').showModal();});
$('#close-lightbox').addEventListener('click',()=>$('#lightbox').close());
[$('#lightbox'),$('#upload-dialog')].forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){if(dialog.id==='upload-dialog')closeUpload();else dialog.close();}}));

function showPage(){
  let next=location.hash.slice(1);if(!['home','life','time'].includes(next)){location.replace('#home');return;}
  page=next;stopWheel();cancelAnimationFrame(magnet.raf);magnet.raf=0;magnet.tween=null;[magnet.x,magnet.y,magnet.tx,magnet.ty]=[0,0,0,0];paintMagnet();wheelLast=0;
  document.querySelectorAll('.page').forEach(section=>{section.hidden=section.id!==`${page}-page`;section.classList.remove('page-enter');});document.querySelectorAll('[data-nav]').forEach(link=>{link.classList.toggle('active',link.dataset.nav===page);if(link.dataset.nav===page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  scrollTo({top:0,behavior:'instant'});document.title=`Shiguang · ${{home:'Keep a Moment',life:'My Life',time:'Time Trail'}[page]}`;
  const view=$(`#${page}-page`);if(!reducedMotion.matches)view.classList.add('page-enter');
  if(page==='life'){wheelRect=$('#wheel-stage').getBoundingClientRect();paintWheel();}
  if(page==='time'){camera=0;cameraTarget=0;lastTimePair=-1;fitCorridor();paintCorridor();$('#time-progress').value=0;$('#scroll-invitation').style.opacity='1';}
}
addEventListener('resize',()=>{magnet.rect=null;wheelRect=null;if(page==='life')paintWheel();fitCorridor();if(page==='time')onTimeScroll();});
addEventListener('hashchange',showPage);addEventListener('blur',()=>{stopWheel();tweenMagnet(0,0,0,0,true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopWheel();wheelLast=0;cancelAnimationFrame(wheelRaf);wheelRaf=0;cancelAnimationFrame(timeRaf);timeRaf=0;cancelAnimationFrame(magnet.raf);magnet.raf=0;}else if(page==='time')onTimeScroll();});
reducedMotion.addEventListener('change',()=>{stopWheel();magnet.tween=null;[magnet.x,magnet.y,magnet.tx,magnet.ty]=[0,0,0,0];paintMagnet();if(page==='life')paintWheel();if(page==='time')onTimeScroll();});
async function restoreMoments(){
  try{const saved=await momentStorage.list();photos.unshift(...saved);}
  catch{toast('Browser storage is unavailable. You can still browse the examples.');}
  buildWheel();buildCorridor();showPage();
}
restoreMoments();
