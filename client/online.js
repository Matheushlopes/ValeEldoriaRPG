/* Rede e autenticação: isoladas da lógica de combate do protótipo. */
'use strict';
const Online = (() => {
  const TOKEN_KEY = 'eldoria_online_token';
  let token = sessionStorage.getItem(TOKEN_KEY);
  let socket = null;
  let selfId = null;
  let peers = [];
  const peerMotion = new Map();
  const remoteShots = [];
  let rankingOpen = false;
  let serverMonsters = false;
  let lastSent = 0;
  let reconnectTimer = null;
  let shouldReconnect = true;
  const $online = id => document.getElementById(id);

  function status(message) { $online('online-status').textContent = message; }
  async function request(path, options = {}) {
    const headers = {'Content-Type':'application/json'};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch('/api' + path, {...options, headers});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(typeof data.detail === 'string' ? data.detail : 'Erro na requisição');
    return data;
  }
  function showAuth() {
    adventureStarted = false;
    $online('online-gate').classList.remove('hidden');
    $online('online-account').classList.remove('hidden');
    $online('character-creation').classList.add('hidden');
  }
  function showCreation() {
    $online('online-gate').classList.add('hidden');
    $online('character-creation').classList.remove('hidden');
  }
  function applyCharacter(character) {
    const choice = GAME_RULES.starters[character.class_id];
    Object.assign(hero, {
      name:character.name, classId:character.class_id, className:choice.label,
      level:character.level, xp:character.xp, gold:character.gold,
      str:character.str, int:character.int, dex:character.dex, con:character.con,
      points:character.points
    });
    player.x = character.x;
    player.y = character.y;
    // Equipamento inicial segue o mesmo construtor do jogo offline anterior.
    const w = choice.weapon;
    equipment.weapon = makeStarter(w.name,'weapon',w.stat,w.base,w.iconSrc,w.weaponKind);
    for (const [slot,name,value,icon] of [
      ['helmet','Capuz de Couro do Novato',1,'icons/item-040.svg'],
      ['armor','Colete de Couro do Novato',2,'icons/item-060.svg'],
      ['gloves','Luvas de Couro do Novato',1,'icons/item-080.svg'],
      ['boots','Botas de Couro do Novato',1,'icons/item-100.svg'],
      ['ring','Anel do Primeiro Passo',1,'icons/item-120.svg'],
      ['amulet','Colar da Primeira Jornada',1,'icons/item-140.svg']
    ]) equipment[slot] = makeStarter(name,slot,'defense',value,icon);
    recalcHero();
    hero.hp = Math.min(hero.maxHp, character.hp > 0 ? character.hp : hero.maxHp);
    hero.mp = Math.min(hero.maxMp, character.mp > 0 ? character.mp : hero.maxMp);
    $online('hero-name').textContent = character.name;
    $online('character-creation').classList.add('hidden');
    $online('online-gate').classList.add('hidden');
    adventureStarted = true;
    last = performance.now(); lastPaint = 0;
    keys.clear(); updateHud(); renderCharacter(); renderInventory();
    status('Conectando…');
    connect();
  }
  async function initialize() {
    if (!token) return showAuth();
    try {
      const data = await request('/me');
      if (data.character) applyCharacter(data.character);
      else showCreation();
    } catch (_) {
      token = null; sessionStorage.removeItem(TOKEN_KEY); showAuth();
    }
  }
  async function submitAuth(event) {
    event.preventDefault();
    const action = event.submitter?.value || 'login';
    const username = $online('online-username').value;
    const password = $online('online-password').value;
    try {
      const result = await request('/' + action, {method:'POST', body:JSON.stringify({username,password})});
      token = result.token; sessionStorage.setItem(TOKEN_KEY,token);
      $online('online-password').value = '';
      const me = await request('/me');
      if (me.character) applyCharacter(me.character);
      else showCreation();
    } catch (error) { $online('online-error').textContent = error.message; }
  }
  async function createCharacter(name, classId) {
    try {
      const character = await request('/characters', {
        method:'POST', body:JSON.stringify({name,class_id:classId})
      });
      applyCharacter(character);
    } catch (error) { $online('creation-error').textContent = error.message; }
  }
  function connect() {
    if (!token || !shouldReconnect) return;
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${location.host}/ws`);
    socket.addEventListener('open', () => socket.send(JSON.stringify({type:'auth',token})));
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.type === 'welcome') {
        selfId = message.self;
        if (Array.isArray(message.inventory)) {
          inventory.splice(0,inventory.length,...message.inventory);
          nextItemId = Math.max(nextItemId, ...inventory.map(item => item.id + 1), 1);
          renderInventory();
        }
      }
      if (message.monsters) syncMonsters(message.monsters);
      if (message.type === 'mob_hit') {
        const mob=monsters.find(m=>m.id===message.mob_id);
        if(mob){mob.hp=message.hp;mob.defeated=message.hp<=0;floatText(message.x,message.y-25,`-${message.hit}`,'#ffe0a0');}
        if(message.kill && message.killer===selfId) show('⚔️ KS! Você finalizou o monstro.');
      }
      if (message.type === 'player_attack' && message.by !== selfId) {
        const shooter=peers.find(p=>p.id===message.by);
        if(shooter){
          peerMotion.set(shooter.id,{...(peerMotion.get(shooter.id)||{}),attackUntil:performance.now()+260});
          if(message.class_id!=='warrior') remoteShots.push({x:message.x,y:message.y,tx:message.target_x,ty:message.target_y,type:message.class_id==='archer'?'arrow':'fire',start:performance.now(),duration:message.class_id==='archer'?430:650});
        }
      }
      if (message.type === 'player_hit' && message.player_id === selfId) {
        hero.hp = message.hp;
        floatText(player.x,player.y-28,`-${message.hit}`,'#ff8585');
        updateHud();
      }
      if (message.type === 'player_respawn' && message.player_id === selfId) {
        player.x=message.x;player.y=message.y;
        hero.hp=message.hp;hero.gold=message.gold;
        show(`💀 Você caiu! Perdeu ${message.lost_gold} ouro.`);
        updateHud();
      }
      if (message.type === 'reward') {
        hero.xp=message.xp;hero.gold=message.gold;hero.level=message.level;hero.points=message.points;
        floatText(player.x,player.y-34,`+${message.gained_xp} XP · +${message.gained_gold} ouro`,'#f7d777');
        if (message.item) {
          if (!inventory.some(i => i.id === message.item.id)) inventory.push(message.item);
          nextItemId=Math.max(nextItemId,message.item.id+1);
          show('🎁 Drop: '+message.item.name+'!');
          renderInventory();
        } else if (message.loot_status === 'full') {
          show('🎒 Bolsa cheia! Drop não recebido.');
        } else if (message.loot_status === 'no_template') {
          show('⚠️ Drop indisponível nesta região.');
        }
        recalcHero();updateHud();renderCharacter();
      }
      if (message.type === 'players' || message.type === 'welcome') {
        const now=performance.now();
        peers = message.players.filter(p => p.id !== selfId);
        for(const p of peers){const m=peerMotion.get(p.id)||{};if(m.x===undefined){m.x=p.x;m.y=p.y;}m.moving=Math.hypot(p.x-m.x,p.y-m.y)>2;m.targetX=p.x;m.targetY=p.y;m.last=now;peerMotion.set(p.id,m);}
        for(const id of peerMotion.keys())if(!peers.some(p=>p.id===id))peerMotion.delete(id);
        status(`🟢 Online · ${message.players.length} jogador(es)`);
      }
    });
    socket.addEventListener('close', event => {
      peers = [];
      status('🔴 Desconectado · reconectando…');
      if ([4001,4003].includes(event.code)) { shouldReconnect=false; showAuth(); return; }
      if (shouldReconnect) reconnectTimer = setTimeout(connect, 2500);
    });
  }
  function syncMonsters(list) {
    serverMonsters=true;
    const existing=new Map(monsters.map(m=>[m.id,m]));
    const updated=[];
    for(const data of list){
      let mob=existing.get(data.id);
      if(!mob){
        mob={...data,phase:data.id*1.7,spawnX:data.x,spawnY:data.y,
             baseLevel:data.level,aggro:false,nextHit:0,respawnAt:0};
      }
      // Snapshots a 2 Hz: interpolar a posição, sem teletransporte visual.
      if (mob._targetX === undefined) {mob._targetX=mob.x;mob._targetY=mob.y;}
      const {x:serverX,y:serverY,...rest}=data;
      Object.assign(mob,rest);
      mob._targetX=serverX;mob._targetY=serverY;
      if(Math.hypot(mob.x-serverX,mob.y-serverY)>180){mob.x=serverX;mob.y=serverY;}
      updated.push(mob);
    }
    monsters.splice(0,monsters.length,...updated);
  }
  function attack(mob,magic=false) {
    if(!serverMonsters || !socket || socket.readyState!==WebSocket.OPEN)return;
    socket.send(JSON.stringify({type:'attack',mob_id:mob.id,magic}));
  }
  function shared(){return serverMonsters;}
  function tick(now) {
    if(serverMonsters){
      for(const mob of monsters){
        if(mob._targetX === undefined)continue;
        mob.x+=(mob._targetX-mob.x)*.18;
        mob.y+=(mob._targetY-mob.y)*.18;
      }
    }
    if (!adventureStarted || !socket || socket.readyState !== WebSocket.OPEN) return;
    if (now-lastSent < 150) return;
    lastSent=now;
    socket.send(JSON.stringify({type:'move',x:player.x,y:player.y,face:player.face}));
  }
  function draw(ctx, visible) {
    const now=performance.now();
    for (const p of peers) {
      const m=peerMotion.get(p.id)||{x:p.x,y:p.y};
      m.x+=(p.x-m.x)*.28;m.y+=(p.y-m.y)*.28;
      if(!visible(m.x,m.y))continue;
      const bob=m.moving?Math.sin(now/115+p.id)*2:0;
      ctx.save();ctx.translate(m.x,m.y);
      if(p.face==='left')ctx.scale(-1,1);
      const sprite=typeof ACTOR_SPRITES!=='undefined'&&ACTOR_SPRITES.player;
      if(sprite?.complete&&sprite.naturalWidth)ctx.drawImage(sprite,-19,-24+bob,38,42);
      else {ctx.fillStyle='#355e79';ctx.fillRect(-10,-13+bob,20,28);ctx.fillStyle='#f0c59b';ctx.fillRect(-7,-19+bob,14,12);}
      // Classe visível mesmo com o sprite base compartilhado.
      ctx.fillStyle=p.class_id==='warrior'?'#e6b668':p.class_id==='archer'?'#83df91':'#b6a1ff';
      ctx.fillRect(-12,8+bob,24,4);
      if(m.attackUntil>now){ctx.strokeStyle='#ffdd8b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-3,22,-.8,.7);ctx.stroke();}
      ctx.restore();
      ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff3d6';
      ctx.fillText(p.name+' · Nv '+p.level,m.x,m.y-32);
    }
    for(let i=remoteShots.length-1;i>=0;i--){
      const shot=remoteShots[i],t=(now-shot.start)/shot.duration;
      if(t>=1){remoteShots.splice(i,1);continue;}
      const x=shot.x+(shot.tx-shot.x)*t,y=shot.y+(shot.ty-shot.y)*t;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(shot.ty-shot.y,shot.tx-shot.x));
      if(shot.type==='arrow'){ctx.strokeStyle='#ffe4a3';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(12,0);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(6,-5);ctx.lineTo(6,5);ctx.fill();}
      else{ctx.shadowColor='#ff6b22';ctx.shadowBlur=17;ctx.fillStyle='#ff8a22';ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe39b';ctx.beginPath();ctx.arc(3,0,4,0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
  }
  async function openRanking(){
    const panel=$online('ranking-panel');rankingOpen=!rankingOpen;panel.classList.toggle('hidden',!rankingOpen);
    if(!rankingOpen)return;
    const body=$online('ranking-rows');body.textContent='Carregando...';
    try{const data=await request('/ranking');body.replaceChildren();for(const p of data.players){const row=document.createElement('tr');for(const value of [p.position,p.name,({warrior:'Guerreiro',archer:'Arqueiro',mage:'Mago'})[p.class_id]||p.class_id,p.level,p.xp]){const td=document.createElement('td');td.textContent=value;row.append(td);}body.append(row);}}
    catch(e){body.textContent=e.message;}
  }
  let spendingPoint = false;
  async function spendPoint(stat) {
    if (spendingPoint || !adventureStarted || hero.points <= 0) return;
    spendingPoint = true;
    try {
      const updated = await request('/characters/points', {
        method:'POST', body:JSON.stringify({stat})
      });
      for (const key of ['str','int','dex','con','points']) hero[key] = updated[key];
      recalcHero(); renderCharacter(); updateHud(); renderInventory();
    } catch (error) {
      show('Não foi possível distribuir ponto: ' + error.message);
      try {
        const me = await request('/me');
        if (me.character) {
          for (const key of ['str','int','dex','con','points']) hero[key] = me.character[key];
          recalcHero(); renderCharacter(); updateHud(); renderInventory();
        }
      } catch (_) {}
    } finally { spendingPoint = false; }
  }
  async function removeItem(itemId) {
    await request('/inventory/' + encodeURIComponent(itemId), {method:'DELETE'});
  }
  async function clearItems() {
    await request('/inventory', {method:'DELETE'});
  }
  function logout() {
    shouldReconnect=false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket) socket.close();
    request('/logout',{method:'POST'}).catch(()=>{}).finally(()=>{
      sessionStorage.removeItem(TOKEN_KEY);
      location.reload();
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    $online('online-auth-form').addEventListener('submit', submitAuth);
    $online('online-logout').addEventListener('click', logout);
    $online('ranking-toggle').addEventListener('click',openRanking);
    $online('ranking-close').addEventListener('click',()=>{rankingOpen=false;$online('ranking-panel').classList.add('hidden');});
    initialize();
  });
  return {createCharacter,tick,draw,attack,shared,spendPoint,removeItem,clearItems};
})();
