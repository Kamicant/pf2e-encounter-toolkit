export const ID = 'pf2e-encounter-toolkit';
export const CHANNEL = `module.${ID}`;
export const SYSTEMS = [
  ['telegraphs','Boss Telegraphs','fa-bullseye'],
  ['phases','Boss Phase Director','fa-dragon'],
  ['zones','Dynamic Battlefield','fa-fire'],
  ['weakpoints','Weak Points','fa-crosshairs'],
  ['squads','Horde Commander','fa-users'],
  ['breaks','Break Gauge','fa-gauge-high'],
  ['dialogues','Cinematic Announcements','fa-comment-dots'],
  ['interactions','Environmental Interactions','fa-hand'],
  ['behaviors','Morale & Behavior','fa-brain'],
  ['objectives','Encounter Objectives','fa-list-check']
];
export const blank = () => Object.fromEntries(SYSTEMS.map(([k])=>[k, k==='breaks' || k==='weakpoints' ? {} : []]));
export function state(scene=canvas?.scene){
  const saved=scene?.getFlag(ID,'state') || {};
  return {...blank(), ...foundry.utils.deepClone(saved)};
}
export async function save(next,scene=canvas?.scene){
  requireGM();
  if(!scene) throw new Error('Open a scene first.');
  await scene.setFlag(ID,'state',next);
  Hooks.callAll('petEncounterToolkitStateChanged',scene);
}
export function requireGM(){if(!game.user?.isGM) throw new Error('Only the GM can change encounter data.');}
export function enabled(k){return Boolean(game.settings.get(ID,`feature-${k}`));}
export function unique(){return foundry.utils.randomID(12);}
export function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function num(value, fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback;}
export function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
export function notify(message,type='info'){(ui.notifications?.[type] || ui.notifications?.info).call(ui.notifications,message);}
export function selected(){return canvas?.tokens?.controlled?.[0]||null;}
export function selectedMany(){return [...(canvas?.tokens?.controlled||[])];}
export function tokenName(id){return canvas?.scene?.tokens?.get(id)?.name||'Unknown token';}
export const dialog = () => foundry.applications.api.DialogV2;
export async function menu(title,choices,caption=''){
  const answer=await dialog().wait({window:{title},content:`<div class="pet-form"><p>${esc(caption)}</p></div>`,buttons: choices.map(([action,label])=>({action,label})),rejectClose:false});
  return answer;
}
export async function form(title, fields, {help='Save to this scene. All changes are GM-controlled.',okLabel='Save'}={}){
  const content=`<div class="pet-form"><p>${esc(help)}</p>${fields.map(f=>{
    if(f.type==='select') return `<label>${esc(f.label)}<select name="${esc(f.name)}">${(f.options||[]).map(o=>`<option value="${esc(o.value)}" ${String(f.value)===String(o.value)?'selected':''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    if(f.type==='textarea')return `<label>${esc(f.label)}<textarea rows="3" name="${esc(f.name)}">${esc(f.value)}</textarea></label>`;
    if(f.type==='checkbox')return `<label class="pet-check"><input name="${esc(f.name)}" type="checkbox" ${f.value?'checked':''}> ${esc(f.label)}</label>`;
    return `<label>${esc(f.label)}<input name="${esc(f.name)}" type="${f.type||'text'}" ${f.type==='number'?'step="any"':''} value="${esc(f.value??'')}" ${f.required?'required':''}></label>`;
  }).join('')}</div>`;
  return await dialog().input({window:{title},content,ok:{label:okLabel},rejectClose:false});
}
export async function announce(title,message,{portrait='',whisper=false}={}){
  if(!game.user?.isGM)return;
  const safeTitle=esc(title), safeBody=esc(message);
  await ChatMessage.create({content:`<div class="pet-chat"><strong>${safeTitle}</strong><div>${safeBody}</div></div>`,speaker:{alias:'Encounter Director'},whisper:whisper?game.users.filter(u=>u.isGM).map(u=>u.id):[]});
  if(!whisper){
    const payload={type:'banner',sender:game.user.id,title:String(title),message:String(message),portrait:String(portrait||'')};
    game.socket.emit(CHANNEL,payload);
    banner(payload);
  }
}
export function banner({title,message,portrait}){
  const el=document.createElement('div');
  el.className='pet-announcement';
  if(portrait && /^(modules\/|systems\/|worlds\/|https?:\/\/)/.test(portrait)){
    const img=document.createElement('img');img.src=portrait;img.alt='Portrait';el.appendChild(img);
  }
  const text=document.createElement('div');
  const t=document.createElement('strong');t.textContent=title||'Encounter';
  const p=document.createElement('p');p.textContent=message||'';
  text.append(t,p);el.appendChild(text);
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),6500);
}
export function findTokenId(id){return canvas?.scene?.tokens?.get(id)||null;}
export function round(){return game.combat?.round||0;}
export async function createCircle(token,distance,color='#ff3333',label='zone',shape='circle',direction=0,width=10){
  if(!canvas?.scene)throw new Error('No active scene.');
  const center=token?.center||{x:canvas.dimensions.width/2,y:canvas.dimensions.height/2};
  const docs=await canvas.scene.createEmbeddedDocuments('MeasuredTemplate',[{
    t:['circle','cone','ray','rect'].includes(shape)?shape:'circle', x:center.x,y:center.y,distance:Math.max(5,distance),
    direction,angle:shape==='cone'?90:360,width,fillColor:color,borderColor:color,
    flags:{[ID]:{label}}
  }]);
  return docs[0]?.id;
}
export async function removeTemplate(id){if(canvas?.scene?.templates?.get(id))await canvas.scene.deleteEmbeddedDocuments('MeasuredTemplate',[id]);}
export function checkboxSetting(k){return game.settings.get(ID,`feature-${k}`);}
