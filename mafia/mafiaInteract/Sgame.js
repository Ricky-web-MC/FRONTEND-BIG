// ===== Sgame.js (updated) =====
// Singleplayer flow with "fake players" and realistic phases:
// - role reveal -> prep countdown -> night (pick PlayerX) -> day (announce deaths) -> voting (usernames) -> repeat until win
(() => {
  // ---------- config ----------
  const PREP_COUNTDOWN = 5;   // seconds before game start (you asked for show)
  const NIGHT_DURATION = 20;  // seconds for mafia action (countdown visible)
  const DAY_DURATION = 12;    // seconds for discussion before voting (you can tweak)
  const VOTE_DURATION = 20;   // seconds voting window (bots + user vote)
  // ---------- elements ----------
  const board = document.getElementById('board');
  const centerMessage = document.getElementById('centerMessage');
  const playerAvatar = document.getElementById('playerAvatar');
  const playerNameEl = document.getElementById('playerName');
  const playerRoleEl = document.getElementById('playerRole');
  const playersListEl = document.getElementById('playersList');
  const gameLog = document.getElementById('gameLog');
  const phaseLabel = document.getElementById('phaseLabel');
  const phaseTimer = document.getElementById('phaseTimer');
  const btnPlayers = document.getElementById('btnPlayers');
  const btnTasks = document.getElementById('btnTasks');
  const modalPlayers = document.getElementById('modalPlayers');
  const modalPlayersList = document.getElementById('modalPlayersList');
  const closeModalPlayers = document.getElementById('closeModalPlayers');
  const modalTasks = document.getElementById('modalTasks');
  const taskText = document.getElementById('taskText');
  const closeModalTasks = document.getElementById('closeModalTasks');
  const btnRestart = document.getElementById('btnRestart');
  const btnBack = document.getElementById('btnBack');
  const clickSound = document.getElementById('clickSound');

  // ---------- load saved values ----------
  const username = localStorage.getItem('username') || 'You';
  const profileImage = localStorage.getItem('profileImage') || '../public/img/profile.jpg';
  const storedCount = parseInt(localStorage.getItem('playerCount') || '8', 10);
  const PLAYER_COUNT = Math.max(5, Math.min(20, storedCount || 8));

  // initial UI set
  playerAvatar.src = profileImage;
  playerNameEl.textContent = username;

  // ---------- game state ----------
  let players = []; // { id, name, role, alive, couplePartner }
  let phase = 'intro'; // intro, prep, night, day, voting, finished
  let timers = {}; // store intervals
  let selectedNightTarget = null;
  let voteMap = {}; // votes during voting
  let userVoted = false;

  // ---------- utilities ----------
  function log(msg){
    const time = new Date().toLocaleTimeString();
    const p = document.createElement('div');
    p.innerHTML = `<small style="opacity:0.6">${time}</small> ${msg}`;
    gameLog.prepend(p);
  }
  function randInt(max){ return Math.floor(Math.random()*max); }
  function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=randInt(i+1); [arr[i],arr[j]]=[arr[j],arr[i]] } return arr }

  function playClick(){
    try{ if(clickSound){ clickSound.currentTime = 0; clickSound.play().catch(()=>{}); } } catch(e){}
  }

  // ---------- role distribution ----------
  function getRoleDistribution(n){
    if(n === 5) return { mafia:1, detective:0, doctor:0, couple:0, spy:0, arsonist:0 };
    if(n === 8) return { mafia:2, detective:0, doctor:0, couple:0, spy:0, arsonist:0 };
    if(n === 12) return { mafia:3, detective:0, doctor:2, couple:0, spy:0, arsonist:0 };
    if(n === 15) return { mafia:3, detective:2, doctor:2, couple:0, spy:0, arsonist:0 };
    if(n === 18) return { mafia:3, detective:2, doctor:2, couple:2, spy:0, arsonist:0 };
    if(n === 20) return { mafia:3, detective:2, doctor:2, couple:2, spy:2, arsonist:1 };
    // fallback
    const mafia = Math.max(1, Math.floor(n/5));
    const detective = Math.floor(n/10);
    const doctor = Math.floor(n/10);
    return { mafia, detective, doctor, couple:0, spy:0, arsonist:0 };
  }

  // ---------- build players (bots + user) ----------
  function buildPlayers(){
    players = [];
    const dist = getRoleDistribution(PLAYER_COUNT);
    const roles = [];
    for(let i=0;i<dist.mafia;i++) roles.push('mafia');
    for(let i=0;i<dist.detective;i++) roles.push('detective');
    for(let i=0;i<dist.doctor;i++) roles.push('doctor');
    for(let i=0;i<dist.couple;i++) roles.push('couple');
    for(let i=0;i<dist.spy;i++) roles.push('spy');
    for(let i=0;i<dist.arsonist;i++) roles.push('arsonist');
    while(roles.length < PLAYER_COUNT) roles.push('villager');
    shuffle(roles);

    // put user at index 0 to simplify
    for(let i=0;i<PLAYER_COUNT;i++){
      const isUser = (i === 0);
      const name = isUser ? username : `Player${i+1}`;
      players.push({
        id: i,
        name,
        role: roles[i],
        alive: true,
        protected: false,
        couplePartner: null
      });
    }

    // pair couples if any
    const distCouple = dist.couple || 0;
    if(distCouple > 0){
      const candidates = players.filter(p => p.role === 'villager');
      shuffle(candidates);
      for(let i=0;i<distCouple && candidates.length>=2;i++){
        const a = candidates.pop(), b = candidates.pop();
        a.couplePartner = b.id;
        b.couplePartner = a.id;
      }
    }
  }

  // ---------- render lists ----------
  function renderPlayersSidebar(){
    playersListEl.innerHTML = '';
    modalPlayersList.innerHTML = '';
    players.forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${p.name}${p.id===0 ? ' (You)':''}</span><span style="opacity:${p.alive?1:0.5}">${p.alive ? 'Alive' : 'Dead'}</span>`;
      playersListEl.appendChild(li);

      const li2 = document.createElement('li');
      li2.textContent = `${p.name} — ${p.role} — ${p.alive ? 'Alive' : 'Dead'}`;
      modalPlayersList.appendChild(li2);
    });
  }

  function showCenter(text, cls=''){
    centerMessage.textContent = text;
    centerMessage.className = 'centerMessage';
    if(cls) centerMessage.classList.add(cls);
    centerMessage.classList.remove('hidden');
  }
  function hideCenter(){
    centerMessage.classList.add('hidden');
  }

  // ---------- role reveal ----------
  function showRoleReveal(){
    const me = players.find(p => p.id === 0);
    playerRoleEl.textContent = me.role.toUpperCase();
    playerRoleEl.className = 'role-badge';
    if(me.role === 'mafia') playerRoleEl.classList.add('role-mafia');
    if(me.role === 'villager') playerRoleEl.classList.add('role-villager');
    if(me.role === 'detective') playerRoleEl.classList.add('role-detective');
    if(me.role === 'doctor') playerRoleEl.classList.add('role-doctor');

    showCenter(`KAMU ADALAH ${me.role.toUpperCase()}`);
    phaseLabel.textContent = 'Role revealed';
  }

  // ---------- start flow ----------
  function startGameFlow(){
    phase = 'prep';
    showRoleReveal();
    setTimeout(() => {
      startPrepCountdown(PREP_COUNTDOWN);
    }, 700); // short delay so user sees role
  }

  function startPrepCountdown(seconds){
    let t = seconds;
    phaseLabel.textContent = 'Persiapan';
    showCenter(`Permainan akan dimulai dalam ${t}...`);
    phaseTimer.textContent = t;
    const iv = setInterval(() => {
      t--;
      phaseTimer.textContent = t;
      showCenter(`Permainan akan dimulai dalam ${t}...`);
      if(t <= 0){
        clearInterval(iv);
        phaseTimer.textContent = '--';
        showCenter('GAME DIMULAI!!!');
        setTimeout(() => { hideCenter(); startNightPhase(); }, 1000);
      }
    }, 1000);
    timers.prep = iv;
  }




  // ----------------------------- NIGHT PHASE UI (Player1..PlayerN target selection) --------------------------------
  function startNightPhase(){
    phase = 'night';
    phaseLabel.textContent = 'Malam';
    selectedNightTarget = null;


    // build target UI: show Player1..PlayerN (only alive non-user targets) with "Kill" button
    const nightPanel = document.createElement('div');
    nightPanel.id = 'nightPanel';
    nightPanel.style.width = '80%';
    nightPanel.style.margin = '0 auto';
    nightPanel.style.display = 'flex';
    nightPanel.style.flexDirection = 'column';
    nightPanel.style.alignItems = 'center';
    nightPanel.style.gap = '10px';
    nightPanel.style.padding = '12px';
    nightPanel.style.borderRadius = '12px';
    nightPanel.style.background = 'rgba(0,0,0,0.5)';

    const title = document.createElement('div');
    title.innerHTML = `<strong style="font-size:20px;color:#ffd">${'Malam hari tiba - Pilih target (PlayerX)'}</strong>`;
    nightPanel.appendChild(title);

    // list targets (label as Player1..PlayerN). we MUST use placeholder "Player#" names
    const listWrap = document.createElement('div');
    listWrap.style.display = 'flex';
    listWrap.style.flexWrap = 'wrap';
    listWrap.style.justifyContent = 'center';
    listWrap.style.gap = '10px';
    players.forEach(p => {
      if(!p.alive) return;
      // exclude user from being displayed as selectable? If user is mafia, he can pick others (exclude self)
      const label = `Player${p.id+1}`;
      const card = document.createElement('button');
      card.className = 'night-target';
      card.dataset.id = p.id;
      card.style.padding = '8px 14px';
      card.style.borderRadius = '10px';
      card.style.border = '2px solid rgba(255,255,255,0.08)';
      card.style.background = (p.id===0 ? 'rgba(255,255,255,0.04)' : 'rgba(233, 9, 9, 0.6)');
      card.style.cursor = (p.id===0 ? 'not-allowed' : 'pointer');
      card.disabled = (p.id===0); // can't pick yourself
      card.textContent = `${label}${p.id===0?' (You)':''}`;



      card.addEventListener('click', (e) => {
        playClick();

        // unselect others
        document.querySelectorAll('.night-target').forEach(x => x.style.boxShadow = '');
        card.style.boxShadow = '0 0 12px cyan';
        selectedNightTarget = p.id;
        footerKill.style.opacity = '1';
      });

      listWrap.appendChild(card);
    });
    nightPanel.appendChild(listWrap);

    // kill button + info
    const footerKill = document.createElement('div');
    footerKill.style.marginTop = '10px';
    footerKill.style.opacity = 0.4;
    footerKill.style.transition = '0.2s';


    const killBtn = document.createElement('button');
    killBtn.textContent = 'KILL';
    killBtn.className = 'btn';
    killBtn.style.padding = '10px 18px';
    killBtn.style.borderRadius = '12px';
    killBtn.style.marginRight = '8px';


    killBtn.addEventListener('click', () => {
      playClick();
      if(selectedNightTarget === null){
        alert('Pilih target dulu (PlayerX)');
        return;
      }
      // confirm quick
      const target = players.find(pp => pp.id === selectedNightTarget);
      if(!target || !target.alive){
        alert('Target invalid');
        return;
      }
      // lock-in selection for rest of night
      showCenter(`Mafia memilih target: Player${target.id+1}`);
      // store choice for resolving after countdown
      nightPanel.dataset.lockedTarget = target.id;
      // hide UI but keep count
      // (we keep night panel present but disable buttons)
      document.querySelectorAll('.night-target').forEach(b => b.disabled = true);
      killBtn.disabled = true;
    });
    footerKill.appendChild(killBtn);

    // quick "auto pick" for bots (in case user not mafia or does nothing): we still let timer run and pick random target if none chosen
    const autoPickHint = document.createElement('span');
    autoPickHint.style.marginLeft = '12px';
    autoPickHint.style.opacity = '0.8';
    autoPickHint.textContent = 'Jika tidak dipilih, sistem akan auto-pilih saat timer habis.';
    footerKill.appendChild(autoPickHint);

    nightPanel.appendChild(footerKill);

    // insert nightPanel into board and show center "Malam"
    board.appendChild(nightPanel);
    showCenter('Malam hari tiba... aksi berlangsung');
    phaseTimer.textContent = NIGHT_DURATION;

    // run night countdown; resolve when zero
    let t = NIGHT_DURATION;
    const iv = setInterval(() => {
      t--;
      phaseTimer.textContent = t;
      if(t <= 0){
        clearInterval(iv);
        // determine target: lockedTarget if set, else pick random non-mafia alive target
        let locked = nightPanel.dataset.lockedTarget;
        let target = null;
        if(locked !== undefined && locked !== ''){
          const id = parseInt(locked, 10);
          target = players.find(p => p.id === id && p.alive);
        }
        if(!target){
          // if mafia alive exist -> pick a random alive non-mafia; otherwise random alive excluding user? We'll pick random alive excluding mafia
          const potential = players.filter(p => p.alive && p.role !== 'mafia');
          target = potential.length ? potential[randInt(potential.length)] : null;
        }

        // simulate doctor saving and arsonist, detective log etc (simple)
        // doctor save pick random alive
        const doctors = players.filter(p => p.role === 'doctor' && p.alive);
        const doctorSave = doctors.length ? players.filter(p=>p.alive)[randInt(players.filter(p=>p.alive).length)] : null;

        // resolve night: if target chosen and not saved -> dead
        const deaths = [];
        if(target && target.alive){
          if(doctorSave && doctorSave.id === target.id){
            log(`${doctorSave.name} diselamatkan oleh Dokter!`);
          } else {
            deaths.push(target);
          }
        }

        // arsonist act
        const arso = players.find(p => p.role === 'arsonist' && p.alive);
        if(arso){
          const pool = players.filter(p=>p.alive && p.id !== arso.id);
          if(pool.length){
            const burned = pool[randInt(pool.length)];
            if(!deaths.includes(burned) && !(doctorSave && doctorSave.id===burned.id)){
              deaths.push(burned);
              log(`Arsonist membakar ${burned.name}!`);
            }
          }
        }

        // couple effect
        const finalDeaths = [];
        deaths.forEach(d => {
          finalDeaths.push(d);
          if(d.couplePartner !== null){
            const partner = players.find(x => x.id === d.couplePartner);
            if(partner && partner.alive && !finalDeaths.includes(partner)) finalDeaths.push(partner);
          }
        });

        // apply deaths
        finalDeaths.forEach(d => { d.alive = false; log(`${d.name} mati di malam hari. (${d.role})`); });

        // cleanup night UI
        board.removeChild(nightPanel);
        hideCenter();

        renderPlayersSidebar();

        // move to day with list of night deaths
        startDayPhase(finalDeaths);
      }
    }, 1000);
    timers.night = iv;
  };




  // ----------------------------------------------DAY PHASE ---------------------------
  function startDayPhase(nightDeaths){
    phase = 'day';
    phaseLabel.textContent = 'Siang';
    phaseTimer.textContent = DAY_DURATION;
    const deathNames = (nightDeaths && nightDeaths.length) ? nightDeaths.map(d => d.name).join(', ') : null;

    if(deathNames){
      showCenter(`Siang pun tiba. Korban malam ini: ${deathNames}`);
      log(`Korban malam: ${deathNames}`);
    } else {
      showCenter('Siang pun tiba. Tidak ada korban malam ini.');
      log('Malam berlalu, tidak ada korban.');
    }

    // after a short delay, hide center and open voting stage
    setTimeout(() => {
      hideCenter();
      // brief discussion period before voting (we will auto-log bot chatter)
      startDiscussion(DAY_DURATION);
    }, 1500);
  }




  // generate some dummy chat logs for immersion
  function startDiscussion(seconds){
    phaseTimer.textContent = seconds;
    let t = seconds;
    const iv = setInterval(() => {
      t--;
      phaseTimer.textContent = t;
      // occasionally log a bot comment
      if(Math.random() < 0.22){
        const bot = players.filter(p=>p.alive && p.id!==0)[randInt(players.filter(p=>p.alive && p.id!==0).length)];
        if(bot) log(`${bot.name}: "Aku curiga sama ${players.filter(x=>x.alive && x.id!==bot.id)[randInt(players.filter(x=>x.alive && x.id!==bot.id).length)].name}"`);
      }
      if(t <= 0){
        clearInterval(iv);
        startVotingPhase();
      }
    }, 1000);
    timers.discuss = iv;
  }






  // ----------------------------------------------- VOTING PHASE -----------------------------------
  function startVotingPhase(){
    phase = 'voting';
    phaseLabel.textContent = 'Voting';
    showCenter('Warga berdiskusi. Voting dimulai.');
    phaseTimer.textContent = VOTE_DURATION;
    // show voting UI overlay or reuse center and modalPlayers aside to choose (but we want usernames here)
    // We'll present a modal-like voting panel in board center with username list and vote buttons
    const votePanel = document.createElement('div');
    votePanel.id = 'votePanel';
    votePanel.style.width = '70%';
    votePanel.style.margin = '0 auto';
    votePanel.style.padding = '12px';
    votePanel.style.borderRadius = '12px';
    votePanel.style.background = 'rgba(0,0,0,0.6)';
    votePanel.style.display = 'flex';
    votePanel.style.flexDirection = 'column';
    votePanel.style.alignItems = 'center';
    votePanel.style.gap = '10px';

    const heading = document.createElement('div');
    heading.innerHTML = '<strong style="font-size:20px;color:#ffd">Voting - Pilih siapa yang akan dieksekusi</strong>';
    votePanel.appendChild(heading);

    // current alive list (usernames)
    const userList = document.createElement('div');
    userList.style.display = 'flex';
    userList.style.flexWrap = 'wrap';
    userList.style.gap = '8px';
    userList.style.justifyContent = 'center';
    players.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'vote-btn';
      btn.dataset.id = p.id;
      btn.textContent = `${p.name}${p.id===0 ? ' (You)' : ''}`;
      btn.style.padding = '8px 12px';
      btn.style.borderRadius = '10px';
      btn.disabled = !p.alive; // dead can't be chosen
      if(!p.alive) btn.style.opacity = '0.5';
      btn.addEventListener('click', () => {
        // if user clicks, register user vote
        playClick();
        if(!players[0].alive) { alert('You are dead, cannot vote'); return; }
        if(userVoted) return;
        userVoted = true;
        voteMap[0] = parseInt(btn.dataset.id,10);
        btn.style.boxShadow = '0 0 10px cyan';
        log(`${username} memilih ${players.find(x=>x.id==btn.dataset.id).name}`);
      });
      userList.appendChild(btn);
    });
    votePanel.appendChild(userList);

    board.appendChild(votePanel);

    // initialize votes
    voteMap = {};
    userVoted = false;

    // bots will vote randomly in a staggered fashion
    function botsVote(){
      const aliveBots = players.filter(p => p.alive && p.id !== 0);
      aliveBots.forEach((bot, idx) => {
        setTimeout(()=> {
          // bot picks someone alive (can vote for user)
          const pool = players.filter(p => p.alive && p.id !== bot.id);
          if(pool.length === 0) return;
          const pick = pool[randInt(pool.length)];
          voteMap[bot.id] = pick.id;
          log(`${bot.name} memilih ${pick.name}`);
        }, 400 + idx * (400 + Math.random()*600));
      });
    }
    botsVote();

    // countdown, auto-vote user if not voted (for immersion assume user sometimes forgets)
    let t = VOTE_DURATION;
    const iv = setInterval(() => {
      t--;
      phaseTimer.textContent = t;
      if(t <= 0){
        clearInterval(iv);
        // if user didn't vote but is alive, choose random for them (to keep flow)
        if(!userVoted && players[0].alive){
          const pool = players.filter(p => p.alive && p.id !== 0);
          if(pool.length) {
            voteMap[0] = pool[randInt(pool.length)].id;
            log(`${username} tidak memilih, otomatis memilih ${players.find(x=>x.id==voteMap[0]).name}`);
          }
        }


        // tally votes and resolve
        const tally = {};
        Object.values(voteMap).forEach(votedId => {
          if(votedId != null) tally[votedId] = (tally[votedId] || 0) + 1;
        });

        let executed = null;
        let maxVotes = 0;
        for(const [id, count] of Object.entries(tally)){
          if(count > maxVotes){
            maxVotes = count;
            executed = players.find(p => p.id === parseInt(id));
          }
        }

        // show result
        if(executed){
          executed.alive = false;
          log(`${executed.name} mendapat suara terbanyak (${maxVotes}) dan dieksekusi.`);
          showCenter(`${executed.name} (${executed.role}) dieksekusi!`);
        } else {
          log('Tidak ada yang dieksekusi hari ini.');
          showCenter('Tidak ada yang dieksekusi.');
        }

        renderPlayersSidebar();
        board.removeChild(votePanel);

        // check win condition setelah sedikit delay biar efek muncul
        setTimeout(() => {
          const mafiaAlive = players.filter(p => p.alive && p.role === 'mafia').length;
          const villagersAlive = players.filter(p => p.alive && p.role !== 'mafia').length;

          if(mafiaAlive === 0){
            showCenter('WARGA MENANG!');
            log('Warga berhasil mengalahkan semua mafia!');
            phase = 'finished';
          } else if(villagersAlive === 0){
            showCenter('MAFIA MENANG!');
            log('Mafia menguasai kota!');
            phase = 'finished';
          } else {
            // lanjut ke malam berikutnya
            showCenter('Malam berikutnya tiba...');
            setTimeout(() => {
              hideCenter();
              startNightPhase();
            }, 2000);
          }
        }, 2500);
      }
    }, 1000);
    timers.vote = iv;
  }



  buildPlayers();
  renderPlayersSidebar();
  startGameFlow();


  // === tombol UI dasar ===
btnPlayers.addEventListener("click", () => {
  playClick()
  modalPlayers.classList.toggle("hidden")
})

closeModalPlayers.addEventListener("click", () => {
  playClick()
  modalPlayers.classList.add("hidden")
})

btnTasks.addEventListener("click", () => {
  playClick()
  modalTasks.classList.toggle("hidden")
})

closeModalTasks.addEventListener("click", () => {
  playClick()
  modalTasks.classList.add("hidden")
})

btnRestart.addEventListener("click", () => {
  playClick()
  location.reload() // restart game
})

btnBack.addEventListener("click", () => {
  playClick()
  window.location.href = "home.html"
})

})();
