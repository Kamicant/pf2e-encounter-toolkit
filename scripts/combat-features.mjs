import {ID,state,save,selected,selectedMany,unique,num,clamp,esc,form,menu,announce,notify,round,tokenName,findTokenId} from './common.mjs';

export async function weakpointsUI(){
  const action=await menu('Weak Point System', [['add','Add weak point to selected monster'],['hit','Apply damage to a weak point'],['repair','Repair / reset weak point'],['delete','Delete weak point']], 'Tracks destructible monster components separately from main HP. You decide how an attack targets them and apply damage manually.');
  if(!action)return;
  const t=selected();if(!t?.actor)return notify('Select the creature token whose parts you want to manage.','warn');
  const s=state(), parts=s.weakpoints[t.id]||[];
  if(action==='add'){
    const d=await form(`Weak point: ${t.name}`,[
      {name:'name',label:'Part name',value:'Armored Wing'},
      {name:'max',label:'Part Hit Points',type:'number',value:25},
      {name:'ac',label:'Suggested AC (reference only)',type:'number',value:20},
      {name:'effect',label:'Effect when broken (GM applies manually)',value:'Boss loses its flying attack.'}
    ]);if(!d)return;
    parts.push({id:unique(),name:String(d.name),max:clamp(num(d.max,25),1,100000),hp:clamp(num(d.max,25),1,100000),ac:num(d.ac,20),effect:String(d.effect),broken:false});
    s.weakpoints[t.id]=parts;await save(s);notify('Weak point added.');return;
  }
  if(!parts.length)return notify('This token has no weak points.','warn');
  const id=await menu(`Weak points: ${t.name}`,parts.map(p=>[p.id,`${p.name}: ${p.hp}/${p.max} HP${p.broken?' [BROKEN]':''}`]));
  const p=parts.find(x=>x.id===id);if(!p)return;
  if(action==='delete'){s.weakpoints[t.id]=parts.filter(x=>x.id!==id);await save(s);return;}
  if(action==='hit'){
    const d=await form(`Damage ${p.name}`,[{name:'damage',label:'Damage dealt to this component',type:'number',value:10}]);if(!d)return;
    p.hp=Math.max(0,p.hp-Math.max(0,num(d.damage)));
    if(p.hp===0 && !p.broken){p.broken=true;await announce(`${t.name}: ${p.name} BROKEN`,p.effect||'The monster loses this component. GM: apply its listed consequences.');}
  } else {
    const d=await form(`Repair ${p.name}`,[{name:'healing',label:'HP restored',type:'number',value:p.max}]);if(!d)return;
    p.hp=Math.min(p.max,p.hp+Math.max(0,num(d.healing)));if(p.hp>0)p.broken=false;
  }
  await save(s);
}

export async function breaksUI(){
  const t=selected();if(!t)return notify('Select a creature token before managing its break gauge.','warn');
  const s=state();let p=s.breaks[t.id]||{value:0,max:10,broken:false,effect:'Staggered: GM applies off-guard or another appropriate effect.'};
  const choice=await menu(`Break Gauge — ${t.name}`,[['set','Configure gauge and break outcome'],['change',`Add break buildup (${p.value}/${p.max})`],['clear','Reset break gauge'],['remove','Remove break gauge']],'Separate homebrew resource. No PF2e conditions are automatically applied.');
  if(choice==='set'){
    const d=await form(`Configure break: ${t.name}`,[{name:'max',label:'Maximum Break',type:'number',value:p.max},{name:'effect',label:'GM instruction on break',type:'textarea',value:p.effect}]);if(!d)return;
    p.max=clamp(num(d.max,10),1,100000);p.value=Math.min(p.value,p.max);p.effect=String(d.effect);p.broken=p.value>=p.max;
  }
  if(choice==='change'){
    const d=await form(`Build Break — ${t.name}`,[{name:'amount',label:'Add buildup (negative reduces)',type:'number',value:3}]);if(!d)return;
    p.value=clamp(p.value+num(d.amount),0,p.max);
    if(p.value>=p.max && !p.broken){p.broken=true;await announce(`BREAK! — ${t.name}`,p.effect);}
    if(p.value<p.max)p.broken=false;
  }
  if(choice==='clear'){p.value=0;p.broken=false;}
  if(choice==='remove')delete s.breaks[t.id];else if(choice)s.breaks[t.id]=p;
  if(choice)await save(s);
}

export async function squadsUI(){
  const choice=await menu('Horde Commander',[['create','Create squad from controlled tokens'],['move','Move squad by a grid offset'],['order','Broadcast a squad order'],['delete','Disband squad']], 'Squad movement preserves each token’s relative offset. Moves are GM-controlled and do not automate attacks or bypass PF2e action rules.');
  if(!choice)return;
  const s=state();
  if(choice==='create'){
    const ts=selectedMany();if(ts.length<2)return notify('Select at least two tokens.','warn');
    const d=await form('Name squad',[{name:'name',label:'Squad name',value:'Goblin Mob'}]);if(!d)return;
    s.squads.push({id:unique(),name:String(d.name),tokenIds:ts.map(t=>t.id)});await save(s);notify('Squad saved.');return;
  }
  if(!s.squads.length)return notify('No squads.');
  const id=await menu('Choose squad',s.squads.map(x=>[x.id,`${x.name} (${x.tokenIds.length} tokens)`]));
  const sq=s.squads.find(x=>x.id===id);if(!sq)return;
  if(choice==='delete'){s.squads=s.squads.filter(x=>x.id!==id);await save(s);return;}
  if(choice==='order'){
    const d=await form(`Command ${sq.name}`,[{name:'order',label:'Instruction to announce',value:'The squad advances as one!'}]);if(d)await announce(sq.name,d.order);return;
  }
  if(choice==='move'){
    const d=await form(`Move ${sq.name}`,[{name:'x',label:'Horizontal offset (grid squares; negative = left)',type:'number',value:1},{name:'y',label:'Vertical offset (grid squares; negative = up)',type:'number',value:0}],{help:'Moves all squad tokens at once. Does not spend movement actions or check collisions. Use only for GM-approved repositioning.'});
    if(!d)return;
    const size=canvas.grid?.size||canvas.scene.grid?.size||100;
    const dx=num(d.x)*size,dy=num(d.y)*size;
    const maxX=canvas.dimensions?.width||Infinity,maxY=canvas.dimensions?.height||Infinity;
    const updates=sq.tokenIds.map(tokenId=>canvas.scene.tokens.get(tokenId)).filter(Boolean).map(t=>({_id:t.id,x:clamp(t.x+dx,0,maxX-t.width*size),y:clamp(t.y+dy,0,maxY-t.height*size)}));
    if(updates.length)await canvas.scene.updateEmbeddedDocuments('Token',updates);
    notify(`Moved ${updates.length} tokens. GM: adjudicate any movement costs or triggers.`);
  }
}

export async function moraleUI(){
  const act=await menu('Monster Behavior & Morale',[['add','Configure HP-triggered morale cue'],['reset','Reset existing morale cue'],['remove','Remove morale cue']], 'A GM aide: announces AI-style behavior suggestions when a monster crosses an HP threshold. It does not take turns for you.');
  if(!act)return;
  const s=state();
  if(act==='add'){
    const t=selected();if(!t?.actor)return notify('Select a monster token.','warn');
    const d=await form('Add morale cue',[
      {name:'name',label:'Trigger label',value:'Morale Breaks'},
      {name:'threshold',label:'When HP falls to this %',type:'number',value:35},
      {name:'text',label:'Behavior suggestion',type:'textarea',value:'The creature considers retreating, pleading, or switching targets.'},
      {name:'gmOnly',label:'Whisper this cue to GM only',type:'checkbox',value:true}
    ]);if(!d)return;
    s.behaviors.push({id:unique(),tokenId:t.id,actorId:t.actor.id,name:String(d.name),threshold:clamp(num(d.threshold,35),1,99),text:String(d.text),gmOnly:Boolean(d.gmOnly),triggered:false});await save(s);return;
  }
  if(!s.behaviors.length)return notify('No behavior cues set.');
  const id=await menu('Select morale cue',s.behaviors.map(x=>[x.id,`${tokenName(x.tokenId)}: ${x.name} at ${x.threshold}% ${x.triggered?'✓':''}`]));
  const b=s.behaviors.find(x=>x.id===id);if(!b)return;
  if(act==='remove')s.behaviors=s.behaviors.filter(x=>x.id!==id);else b.triggered=false;
  await save(s);
}
