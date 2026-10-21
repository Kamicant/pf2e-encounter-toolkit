import {ID,CHANNEL,SYSTEMS,enabled,menu,notify,form,state,blank,save,banner,removeTemplate} from './common.mjs';
import {telegraphsUI,phasesUI,zonesUI,advanceZones,reactHPChange,telegraphTurn} from './scene-features.mjs';
import {weakpointsUI,breaksUI,squadsUI,moraleUI} from './combat-features.mjs';
import {dialoguesUI,interactionsUI,objectivesUI,objectiveRound,refreshObjectives,refreshBossTrackers} from './story-features.mjs';

const handlers={telegraphs:telegraphsUI,phases:phasesUI,zones:zonesUI,weakpoints:weakpointsUI,squads:squadsUI,breaks:breaksUI,dialogues:dialoguesUI,interactions:interactionsUI,behaviors:moraleUI,objectives:objectivesUI};
let combatQueue=Promise.resolve();
function isLeadGM(){const gm=game.users?.filter(u=>u.active&&u.isGM)?.sort((a,b)=>a.id.localeCompare(b.id))[0];return !!gm&&gm.id===game.user.id;}

async function open(){
  if(!canvas?.scene)return notify('Open a scene before using the Encounter Toolkit.','warn');
  if(!game.user.isGM)return safe(()=>interactionsUI());
  const choices=[...SYSTEMS.filter(([k])=>enabled(k)).map(([k,label])=>[k,label]),['cleanup','Clear this scene’s toolkit encounter data']];
  if(!choices.length)return notify('All encounter features are disabled in module settings.','warn');
  const selection=await form('PF2e Encounter Toolkit',[{name:'system',label:'Encounter system',type:'select',value:choices[0][0],options:choices.map(([value,label])=>({value,label}))}],{help:'Open a system. Toggle each one in Configure Settings → Module Settings.',okLabel:'Open'});
  if(selection?.system==='cleanup')return safe(resetScene);
  if(selection?.system)await safe(()=>handlers[selection.system]?.());
}
async function resetScene(){
  if(!game.user.isGM)return;
  const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Reset Scene Toolkit Data'},content:'Delete this scene’s saved encounter configurations and toolkit-owned warning templates? This cannot be undone.',rejectClose:false});
  if(!yes)return;
  const s=state();
  const templates=[...s.telegraphs,...s.zones].map(x=>x.templateId).filter(Boolean);
  if(templates.length)await canvas.scene.deleteEmbeddedDocuments('MeasuredTemplate',templates.filter(id=>canvas.scene.templates.get(id)));
  await save(blank());notify('Scene encounter-toolkit data cleared.');
}
async function safe(action){
  try{return await action();}catch(e){console.error(`${ID}: Encounter action failed`,e);notify(`Encounter Toolkit error: ${e.message||e}`,'error');}
}

function installLauncher(){
  if(document.getElementById('pet-launcher'))return;
  const b=document.createElement('button');b.id='pet-launcher';b.type='button';
  b.textContent=game.user.isGM?'⚔ Encounter Tools':'✋ Scene Interactions';
  b.title=game.user.isGM?'Open the ten encounter features':'Request an interaction with a scene object';
  b.addEventListener('click',()=>void open());document.body.appendChild(b);
}

Hooks.once('init',()=>{
  if(game.system.id!=='pf2e')console.warn(`${ID}: Built for PF2e; current system is ${game.system.id}.`);
  for(const [k,label] of SYSTEMS){
    game.settings.register(ID,`feature-${k}`,{name:`Enable ${label}`,hint:'Turn this encounter system on or off independently.',scope:'world',config:true,type:Boolean,default:true});
  }
  const mod=game.modules.get(ID);if(mod)mod.api={open,handlers,state};
});

Hooks.once('ready',()=>{
  installLauncher();refreshObjectives();refreshBossTrackers();
  game.socket.on(CHANNEL,(message)=>{
    if(message?.type!=='banner'||!game.users?.get(message.sender)?.isGM)return;
    banner(message);
  });
  if(game.system.id!=='pf2e')notify('PF2e Encounter Toolkit is intended for the Pathfinder 2e system.','warn');
});
Hooks.on('canvasReady',()=>{refreshObjectives();refreshBossTrackers();installLauncher();});
Hooks.on('updateScene',(scene,change)=>{if(scene.id===canvas?.scene?.id&&Object.prototype.hasOwnProperty.call(change,'flags')){refreshObjectives();refreshBossTrackers();}});
Hooks.on('updateActor',(actor,changes)=>{
  if(!isLeadGM()||!('system' in changes))return;
  if(changes.system?.attributes?.hp && (enabled('phases')||enabled('behaviors')))void safe(()=>reactHPChange(actor));
});
Hooks.on('updateCombat',(combat,changes)=>{
  if(!isLeadGM()||!canvas?.scene)return;
  const combatSceneId=combat.scene?.id||combat.scene||combat.sceneId||combat.parent?.id;
  if(combatSceneId && combatSceneId!==canvas.scene.id)return;
  if(!Object.prototype.hasOwnProperty.call(changes,'round')&&!Object.prototype.hasOwnProperty.call(changes,'turn'))return;
  combatQueue=combatQueue.then(()=>safe(async()=>{
    if(Object.prototype.hasOwnProperty.call(changes,'round')){
      if(enabled('zones'))await advanceZones(combat.round);
      if(enabled('objectives'))await objectiveRound(combat.round);
    }
    if(enabled('telegraphs'))await telegraphTurn(combat);
  }));
});
