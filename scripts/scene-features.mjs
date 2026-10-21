import {ID,state,save,selected,selectedMany,unique,num,clamp,esc,form,menu,announce,notify,round,tokenName,findTokenId,createCircle,removeTemplate} from './common.mjs';

export async function telegraphsUI(){
  const choice=await menu('Boss Telegraphs', [['add','Mark danger around selected token'],['resolve','Resolve or cancel a warning'],['list','View current warnings']], 'Choose a boss token, then place a visible warning template. Resolve it manually when the attack happens.');
  if(choice==='add'){
    const t=selected();if(!t)return notify('Select a boss token first.','warn');
    const data=await form('Create telegraphed attack',[
      {name:'name',label:'Attack name',value:'Devastating Attack',required:true},
      {name:'shape',label:'Warning shape',type:'select',value:'circle',options:[{label:'Circle / burst',value:'circle'},{label:'Line / ray',value:'ray'},{label:'Cone (90°)',value:'cone'}]},
      {name:'size',label:'Radius or length (feet)',type:'number',value:20},
      {name:'direction',label:'Facing in degrees (ray or cone)',type:'number',value:0},
      {name:'width',label:'Ray width in feet',type:'number',value:10},
      {name:'message',label:'Warning shown to players',value:'An enormous attack is charging. Move out of the marked zone!'},
      {name:'color',label:'Template fill color',type:'select',value:'#ff3333',options:[{label:'Red — dangerous',value:'#ff3333'},{label:'Orange — warning',value:'#ff9900'},{label:'Purple — magical',value:'#aa55ff'}]}
    ],{help:'Creates a Foundry circle template, chat warning and optional turn notification. The GM rolls the actual attack.'});
    if(!data)return;
    const id=await createCircle(t,clamp(num(data.size,20),5,200),data.color,data.name,data.shape,num(data.direction),clamp(num(data.width,10),5,100));
    const s=state();s.telegraphs.push({id:unique(),templateId:id,tokenId:t.id,name:String(data.name).slice(0,80),message:String(data.message).slice(0,500),alerted:false,atRound:round(),size:num(data.size,20)});await save(s);
    await announce(`⚠ ${t.name}: ${data.name}`,data.message);
  }
  if(choice==='resolve'){
    const s=state();if(!s.telegraphs.length)return notify('No active telegraphs.');
    const target=await menu('Resolve danger area',s.telegraphs.map(z=>[z.id,`${z.name} (${tokenName(z.tokenId)})`]));
    if(!target)return;
    const item=s.telegraphs.find(z=>z.id===target);if(!item)return;
    const finish=await menu('Resolve telegraph',[['hit','Attack resolved; clear warning'],['cancel','Interrupted; clear warning'],['back','Keep active']]);
    if(finish==='hit'||finish==='cancel'){
      await removeTemplate(item.templateId);s.telegraphs=s.telegraphs.filter(z=>z.id!==target);await save(s);
      await announce(item.name,finish==='hit'?'The telegraphed attack resolves. GM: apply the attack and damage manually.':'The attack was interrupted!');
    }
  }
  if(choice==='list'){
    const s=state();notify(s.telegraphs.length?s.telegraphs.map(x=>x.name).join(' · '):'No active telegraphs.');
  }
}

export async function phasesUI(){
  const option=await menu('Boss Phase Director',[['add','Add threshold for selected NPC'],['view','View phases / reset triggers'],['remove','Remove a phase']], 'Configure a one-time event when a linked or unlinked NPC falls to or below a % of max HP.');
  if(option==='add'){
    const t=selected();if(!t?.actor)return notify('Select the boss NPC token.','warn');
    const d=await form(`Phase for ${t.name}`, [
      {name:'name',label:'Phase title',value:'Phase Two'},
      {name:'threshold',label:'HP threshold %',type:'number',value:50},
      {name:'text',label:'Cinematic announcement',type:'textarea',value:'The boss changes its fighting style!'},
      {name:'art',label:'New token image (optional, Foundry path or URL)',value:''}
    ],{help:'Triggered on HP changes to the selected actor. The art change affects this token only.'});
    if(!d)return;
    const s=state();s.phases.push({id:unique(),tokenId:t.id,actorId:t.actor.id,name:String(d.name),threshold:clamp(num(d.threshold,50),1,99),text:String(d.text),art:String(d.art),triggered:false});await save(s);notify('Phase saved. Lower the boss HP to test.');
  }
  if(option==='view'||option==='remove'){
    const s=state();if(!s.phases.length)return notify('No configured phases.');
    const id=await menu('Boss Phases',s.phases.map(p=>[p.id,`${tokenName(p.tokenId)}: ${p.name} at ${p.threshold}% ${p.triggered?'✓':''}`]));
    if(!id)return;
    if(option==='remove')s.phases=s.phases.filter(x=>x.id!==id);
    else {const p=s.phases.find(x=>x.id===id);p.triggered=false;}
    await save(s);notify(option==='remove'?'Phase deleted.':'Phase reset.');
  }
}

export async function zonesUI(){
  const choice=await menu('Dynamic Battlefield',[['add','Create expanding area'],['advance','Advance zones now'],['remove','Remove an area']], 'Zones expand visually at the start of each combat round. The GM manually adjudicates hazards/damage.');
  if(choice==='add'){
    const t=selected();if(!t)return notify('Select a token to center the zone on.','warn');
    const d=await form('Create expanding hazard',[
      {name:'name',label:'Zone name',value:'Spreading Fire'},
      {name:'radius',label:'Starting radius (feet)',type:'number',value:10},
      {name:'step',label:'Radius growth per round (feet)',type:'number',value:5},
      {name:'max',label:'Maximum radius (feet)',type:'number',value:40},
      {name:'effect',label:'GM instruction when inside area',value:'Creatures in the area face a hazard; GM adjudicates.'}
    ]);
    if(!d)return;
    const radius=clamp(num(d.radius,10),5,200), id=await createCircle(t,radius,'#fc7a29',d.name);
    const s=state();s.zones.push({id:unique(),templateId:id,name:String(d.name),radius,step:clamp(num(d.step,5),0,100),max:clamp(num(d.max,40),radius,300),effect:String(d.effect),lastRound:Math.max(1,round())});await save(s);
    await announce(`Hazard: ${d.name}`,d.effect);
  }
  if(choice==='advance'){await advanceZones(round()+1,true);}
  if(choice==='remove'){
    const s=state();if(!s.zones.length)return notify('No hazard zones.');
    const id=await menu('Remove hazard',s.zones.map(z=>[z.id,`${z.name} (${z.radius} ft)`]));
    const z=s.zones.find(x=>x.id===id);if(!z)return;
    await removeTemplate(z.templateId);s.zones=s.zones.filter(x=>x.id!==id);await save(s);
  }
}

export async function advanceZones(current,manual=false){
  if(!game.user.isGM)return;
  const s=state();let changed=false;
  for(const z of s.zones){
    if(!manual && (!current||z.lastRound>=current))continue;
    const next=Math.min(z.max,z.radius+z.step);
    if(next>z.radius){
      z.radius=next;
      const tpl=canvas.scene.templates.get(z.templateId);
      if(tpl)await tpl.update({distance:z.radius});
      await announce(`${z.name} spreads to ${next} feet`,z.effect);
    }
    z.lastRound=current;changed=true;
  }
  if(changed)await save(s);
}

export async function reactHPChange(actor){
  if(!game.user?.isGM||!canvas?.scene)return;
  const hp=actor.system?.attributes?.hp;
  if(!hp||num(hp.max)<=0)return;
  const percent=100*num(hp.value)/num(hp.max);
  const s=state();let changed=false;
  for(const p of s.phases){
    if(p.triggered || p.actorId!==actor.id || percent>p.threshold)continue;
    const token=findTokenId(p.tokenId);
    if(!token || token.actor?.id!==actor.id)continue;
    p.triggered=true;changed=true;
    if(p.art){try {await token.update({'texture.src':p.art});} catch(e){console.warn(ID,'Token image change failed',e);}}
    await announce(`${token.name}: ${p.name}`,p.text,{portrait:p.art});
  }
  for(const b of s.behaviors){
    if(b.triggered || b.actorId!==actor.id || percent>b.threshold)continue;
    if(!findTokenId(b.tokenId))continue;
    b.triggered=true;changed=true;
    await announce(`${tokenName(b.tokenId)} — ${b.name}`,b.text,{whisper:b.gmOnly});
  }
  if(changed)await save(s);
}

export async function telegraphTurn(combat){
  if(!game.user?.isGM || !combat || !canvas?.scene)return;
  const tokenId=combat.combatant?.tokenId;
  if(!tokenId)return;
  const s=state();let changed=false;
  for(const t of s.telegraphs){
    if(t.tokenId!==tokenId || t.alerted || combat.round<=t.atRound)continue;
    t.alerted=true;changed=true;
    await announce(`⚠ ${t.name} is READY`,'The boss has reached its next turn. GM: resolve or cancel its marked attack.');
  }
  if(changed)await save(s);
}
