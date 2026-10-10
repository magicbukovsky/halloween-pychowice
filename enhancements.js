(()=>{
'use strict';
const $=id=>document.getElementById(id);
const db=window.halloweenDb||window.supabase?.createClient('https://jhxoxuowxwvnmrygioox.supabase.co','sb_publishable_aZIJOi53EyddXbsvBcgSEg_to_LNUTz',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const selected=new Set();
let galleryGeneration=0;
let photoUrls=new Map();
const places=()=>window.halloweenGetEntries?.()||[];
function stats(){
 const all=places();
 $('statCandy').textContent=all.filter(p=>p.candy).length;
 $('statDecor').textContent=all.filter(p=>p.decor&&!p.candy).length;
 $('statTotal').textContent=all.length;
 document.querySelectorAll('.route-check').forEach(c=>{c.checked=selected.has(c.dataset.routeId)});
}
function countdown(){
 const now=new Date(),date=new Date(2026,9,31,17);
 const days=Math.ceil((date-now)/86400000);
 $('countdown').textContent=days>0?'🎃 Do Halloween: '+days+' dni':now.getFullYear()===2026&&now.getMonth()===9&&now.getDate()===31?'🎃 Dzisiaj Halloween!':'🎃 Halloween w Pychowicach';
}
function count(){$('routeCount').textContent='Wybrano '+selected.size+' miejsc'}
document.addEventListener('change',e=>{if(e.target.matches('.route-check')){e.target.checked?selected.add(e.target.dataset.routeId):selected.delete(e.target.dataset.routeId);count()}});
$('clearRoute').onclick=()=>{selected.clear();document.querySelectorAll('.route-check').forEach(c=>c.checked=false);count()};
$('startRoute').onclick=()=>{
 const pts=places().filter(p=>selected.has(p.id)&&p.candy).map(p=>p.lat+','+p.lon);
 if(!pts.length){alert('Zaznacz domy z cukierkami.');return}
 if(pts.length>9){alert('Wybierz maksymalnie 9 miejsc.');return}
 const url='https://www.google.com/maps/dir/?api=1&travelmode=walking&destination='+encodeURIComponent(pts[pts.length-1])+(pts.length>1?'&waypoints='+encodeURIComponent(pts.slice(0,-1).join('|')):'');
 window.open(url,'_blank','noopener,noreferrer');
};
async function gallery(){
 if(!db)return;
 const el=$('gallery');el.replaceChildren();photoUrls=new Map();const generation=++galleryGeneration;
 const items=places().filter(p=>p.image_url);
 if(!items.length){el.textContent='Brak zatwierdzonych zdjęć.';return}
 for(const item of items){
  const {data}=await db.storage.from('halloween-photos').createSignedUrl(item.image_url,3600);
  if(generation!==galleryGeneration)return;if(!data?.signedUrl)continue;photoUrls.set(item.image_url,data.signedUrl);
  const tile=document.createElement('div'),img=document.createElement('img'),caption=document.createElement('small');
  img.src=data.signedUrl;img.alt='Dekoracje: '+item.address;img.loading='lazy';caption.textContent=item.address;
  tile.append(img,caption);tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-label','Pokaż na mapie: '+item.address);tile.style.cursor='pointer';tile.onclick=()=>{const map=document.getElementById('map');if(map)map.scrollIntoView({behavior:'smooth',block:'center'});const card=[...document.querySelectorAll('.house-card')].find(e=>e.textContent.includes(item.address));card?.querySelector('button')?.click()};tile.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tile.click()}};el.append(tile);
  document.querySelectorAll('[data-photo]').forEach(x=>{if(x.dataset.photo===item.image_url)x.src=data.signedUrl});
 }
}
async function admin(){
 if(!db)return;
 const {data:{user},error:authError}=await db.auth.getUser();if(authError)console.warn('Auth:',authError.message);
 $('adminLogout').hidden=!user;
 $('adminEntries').replaceChildren();
 if(!user){$('adminStatus').textContent='Zaloguj się, aby moderować.';return}
 const {data:role,error:roleError}=await db.from('halloween_moderators').select('user_id').eq('user_id',user.id).maybeSingle();if(roleError){$('adminStatus').textContent='Nie udało się sprawdzić uprawnień moderatora.';return}
 if(!role){$('adminStatus').textContent='To konto nie ma przypisanej roli moderatora.';return}
 $('adminStatus').textContent='Zalogowano jako moderator.';
 const {data,error}=await db.from('halloween_places').select('id,address,note,status').eq('status','pending').limit(100);
 if(error){$('adminStatus').textContent='Nie udało się pobrać zgłoszeń.';return}
 if(!data?.length){$('adminEntries').textContent='Brak oczekujących zgłoszeń.';return}
 $('adminStatus').textContent='Oczekujące zgłoszenia: '+data.length;
 for(const item of data){
  const row=document.createElement('div');row.style.cssText='border-top:1px solid #394456;padding:10px 0';
  const name=document.createElement('strong');name.textContent=item.address;row.append(name);
  if(item.note){const p=document.createElement('p');p.textContent=item.note;row.append(p)}
  for(const [status,label] of [['approved','Zatwierdź'],['rejected','Odrzuć']]){
   const btn=document.createElement('button');btn.textContent=label;btn.type='button';btn.className=status==='rejected'?'secondary':'';
   btn.style.margin='5px';
   btn.onclick=async()=>{if(status==='rejected'&&!confirm('Odrzucić zgłoszenie: '+item.address+'?'))return;row.querySelectorAll('button').forEach(b=>b.disabled=true);const {error}=await db.from('halloween_places').update({status}).eq('id',item.id).eq('status','pending');if(error){alert('Błąd moderacji: '+error.message);row.querySelectorAll('button').forEach(b=>b.disabled=false);return}await admin();if(status==='approved')location.reload()};
   row.append(btn);
  }
  $('adminEntries').append(row);
 }
}
$('adminLogin').onclick=async()=>{if(!db)return;const email=$('adminEmail').value.trim();if(!email)return;const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});$('adminStatus').textContent=error?'Nie udało się wysłać linku.':'Sprawdź pocztę i otwórz link logowania.'};
$('adminLogout').onclick=async()=>{await db.auth.signOut();await admin()};
window.addEventListener('halloween:loaded',()=>{stats();gallery()});
if(db){db.auth.onAuthStateChange(()=>{setTimeout(admin,0)});admin()}
countdown();stats();count();
})();