import {ID,state,save,selected,unique,num,clamp,form,menu,announce,notify,round,tokenName,esc} from './common.mjs';

export async function dialoguesUI(){
  const act=await menu('Cinematic Dialogue',[['speak','Send announcement now'],['save','Save reusable speech'],['play','Play saved speech'],['delete','Delete saved speech']], 'Animated banners appear to all players connected to this scene and are also recorded in chat.');
  if(!act)return;
  const s=state();
  if(act==='speak'||act==='save'){
    const t=selected();
    const d=await form(act==='save'?'Create scripted announcement':'Send announcement',[
      {name:'title',label:'Speaker or event',value:t?.name||'The Dungeon Master'},
      {name:'text',label:'Dialogue',type:'textarea',value:'The earth trembles...'},
      {name:'portrait',label:'Optional image path / URL',value:t?.document?.texture?.src||''}
    ]);if(!d)return;
    if(act==='save'){
      s.dialogues.push({id:unique(),title:String(d.title),text:String(d.text),portrait:String(d.portrait)});await save(s);
    } else await announce(d.title,d.text,{portrait:d.portrait});
  }
  if(act==='play'||act==='delete'){
    if(!s.dialogues.length)return notify('No saved announcements.');
    const id=await menu('Saved dialogue',s.dialogues.map(x=>[x.id,`${x.title}: ${x.text.slice(0,40)}`]));
    const d=s.dialogues.find(x=>x.id===id);if(!d)return;
    if(act==='delete'){s.dialogues=s.dialogues.filter(x=>x.id!==id);await save(s);}
    else await announce(d.title,d.text,{portrait:d.portrait});
  }
}

export async function interactionsUI(){
  const s=state();
  if(!game.user.isGM){
    if(!s.interactions.length)return notify('No interactive scene objects are configured.');
    const id=await menu('Scene Interactions',s.interactions.map(x=>[x.id,`${x.name} — ${x.action}`]),'Select a feature to request an interaction. The GM adjudicates the action and skill check.');
    const item=s.interactions.find(x=>x.id===id);if(!item)return;
    const actor=canvas.tokens.controlled[0]?.actor?.name||game.user.character?.name||game.user.name;
    await ChatMessage.create({content:`<div class="pet-chat"><strong>Interaction requested: ${esc(item.name)}</strong><div>${esc(actor)} wants to ${esc(item.action)}. Suggested ${esc(item.skill)} DC ${item.dc}. ${esc(item.description||'')}</div></div>`,speaker:{alias:actor},whisper:game.users.filter(u=>u.isGM).map(u=>u.id)});
    notify('Sent interaction request to GM.');return;
  }
  const act=await menu('Environmental Interactions',[['add','Add a player-requestable interaction'],['resolve','Resolve interaction publicly'],['delete','Remove interaction']], 'Players can request scene interactions from their own Encounter Toolkit macro. The GM resolves rolls and environmental changes.');
  if(!act)return;
  if(act==='add'){
    const tile=canvas.tiles?.controlled?.[0];
    const d=await form('Configure environment interaction',[
      {name:'name',label:'Interactive object name',value:tile?.document?.texture?.src?.split('/').pop()?.slice(0,30)||'Collapsible Pillar'},
      {name:'action',label:'Player action',value:'topple the pillar'},
      {name:'skill',label:'Suggested skill',value:'Athletics'},
      {name:'dc',label:'Suggested DC',type:'number',value:20},
      {name:'description',label:'Outcome guidance',type:'textarea',value:'Success: the pillar falls; GM changes the arena. Failure: nothing happens.'}
    ]);if(!d)return;
    s.interactions.push({id:unique(),tileId:tile?.id||null,name:String(d.name),action:String(d.action),skill:String(d.skill),dc:num(d.dc,20),description:String(d.description)});await save(s);return;
  }
  if(!s.interactions.length)return notify('No configured scene interactions.');
  const id=await menu('Choose interaction',s.interactions.map(x=>[x.id,`${x.name}: ${x.action}`]));
  const i=s.interactions.find(x=>x.id===id);if(!i)return;
  if(act==='delete'){s.interactions=s.interactions.filter(x=>x.id!==id);await save(s);}
  else {
    const what=await menu(`Resolve ${i.name}`,[['success','Success'],['critical','Critical success'],['failure','Failure'],['secret','GM: show instructions privately']]);
    if(!what)return;
    await announce(`${i.name} — ${what}`,`${i.description} (Suggested check: ${i.skill} DC ${i.dc}.)`,{whisper:what==='secret'});
  }
}

export async function objectivesUI(){
  const act=await menu('Encounter Objectives',[['add','Add an objective'],['change','Update progress'],['clock','Configure round deadline'],['remove','Delete an objective']], 'Public objective display refreshes for players when the scene is updated. Countdown decreases at the start of each combat round.');
  if(!act)return;
  const s=state();
  if(act==='add'){
    const d=await form('Add objective',[
      {name:'name',label:'Objective',value:'Destroy the Three Crystals'},
      {name:'max',label:'Required progress',type:'number',value:3},
      {name:'rounds',label:'Rounds allowed (0 = no deadline)',type:'number',value:0},
      {name:'detail',label:'Short player-facing hint',value:'Shatter crystals to disrupt the ritual.'}
    ]);if(!d)return;
    s.objectives.push({id:unique(),name:String(d.name),max:clamp(num(d.max,3),1,9999),value:0,rounds:Math.max(0,num(d.rounds)),remaining:Math.max(0,num(d.rounds)),lastRound:Math.max(1,round()),detail:String(d.detail),status:'active'});await save(s);return;
  }
  if(!s.objectives.length)return notify('No scene objectives.');
  const id=await menu('Choose objective',s.objectives.map(o=>[o.id,`${o.name}: ${o.value}/${o.max} (${o.status})`]));
  const o=s.objectives.find(x=>x.id===id);if(!o)return;
  if(act==='remove')s.objectives=s.objectives.filter(x=>x.id!==id);
  if(act==='change'){
    const d=await form(`Update ${o.name}`,[{name:'amount',label:'Add progress (negative = remove)',type:'number',value:1}]);if(!d)return;
    o.value=clamp(o.value+num(d.amount),0,o.max);
    if(o.value>=o.max&&o.status==='active'){o.status='completed';await announce(`Objective complete: ${o.name}`,o.detail);}
    if(o.value<o.max && o.status==='completed')o.status='active';
  }
  if(act==='clock'){
    const d=await form(`Round countdown: ${o.name}`,[{name:'rounds',label:'Rounds remaining (0 = none)',type:'number',value:o.remaining}]);if(!d)return;
    o.remaining=Math.max(0,num(d.rounds));o.rounds=o.remaining;o.lastRound=round();if(o.status==='failed')o.status='active';
  }
  await save(s);
}

export async function objectiveRound(current){
  if(!game.user?.isGM||!canvas?.scene)return;
  const s=state();let dirty=false;
  for(const o of s.objectives){
    if(o.status!=='active'||!o.rounds||!current||o.lastRound>=current)continue;
    const elapsed=Math.max(0,current-o.lastRound);
    o.remaining=Math.max(0,o.remaining-elapsed);o.lastRound=current;dirty=true;
    if(o.remaining===0){o.status='failed';await announce(`Objective failed: ${o.name}`,'The deadline has expired. GM: resolve the consequences.');}
  }
  if(dirty)await save(s);
}

let display=null;
export function refreshObjectives(){
  display?.remove();display=null;
  if(!canvas?.scene||!game.settings.get(ID,'feature-objectives'))return;
  const s=state();
  if(!s.objectives.length)return;
  display=document.createElement('div');display.className='pet-objective-tracker';
  const hdr=document.createElement('strong');hdr.textContent='ENCOUNTER OBJECTIVES';display.append(hdr);
  for(const o of s.objectives){
    const div=document.createElement('div');div.className=`pet-goal pet-${o.status}`;
    const top=document.createElement('div');top.textContent=`${o.name} — ${o.value}/${o.max}${o.rounds?` · ${o.remaining} rounds`:''}`;
    const progress=document.createElement('progress');progress.max=o.max;progress.value=o.value;
    const detail=document.createElement('small');detail.textContent=o.detail||'';
    div.append(top,progress,detail);display.append(div);
  }
  document.body.append(display);
}

let bossDisplay=null;
export function refreshBossTrackers(){
  bossDisplay?.remove();bossDisplay=null;
  if(!canvas?.scene || (!game.settings.get(ID,'feature-breaks')&&!game.settings.get(ID,'feature-weakpoints')))return;
  const s=state();
  const breakItems=Object.entries(s.breaks||{}).filter(([id])=>canvas.scene.tokens.has(id));
  const weakItems=Object.entries(s.weakpoints||{}).filter(([id,parts])=>canvas.scene.tokens.has(id)&&parts.length);
  if(!breakItems.length&&!weakItems.length)return;
  bossDisplay=document.createElement('section');bossDisplay.className='pet-boss-tracker';
  const title=document.createElement('strong');title.textContent='BOSS COMPONENTS';bossDisplay.append(title);
  for(const [id,p] of breakItems.slice(0,6)){
    const label=document.createElement('div');label.className='pet-boss-title';label.textContent=`${tokenName(id)} · Break ${p.value}/${p.max}`;
    const progress=document.createElement('progress');progress.max=p.max;progress.value=p.value;progress.className='pet-break-progress';
    bossDisplay.append(label,progress);
  }
  for(const [id,parts] of weakItems.slice(0,6)){
    const name=document.createElement('div');name.className='pet-boss-title';name.textContent=tokenName(id);bossDisplay.append(name);
    for(const p of parts){const line=document.createElement('div');line.className='pet-weakpoint';line.textContent=`${p.name}: ${p.hp}/${p.max} HP${p.broken?' ✖ BROKEN':''}`;bossDisplay.append(line);}
  }
  document.body.append(bossDisplay);
}
