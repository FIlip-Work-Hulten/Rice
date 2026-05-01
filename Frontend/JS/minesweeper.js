// Minimal Minesweeper frontend to interact with the Flask API
(() => {
  let gameId = null;
  let rows = 0, cols = 0;
  let minesTotal = 0;
  let timer = null;
  let seconds = 0;
  let currentLevel = 'beginner';

  function startTimer(){
    stopTimer();
    seconds = 0;
    qs('#ms-timer').textContent = 'Time: 0s';
    timer = setInterval(()=>{ seconds++; qs('#ms-timer').textContent = `Time: ${seconds}s`; }, 1000);
  }
  function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }

  function qs(sel){return document.querySelector(sel)}

  async function apiNew(level){
    const res = await fetch('/api/minesweeper/new', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({level})});
    return res.json();
  }

  async function apiReveal(r,c){
    const res = await fetch('/api/minesweeper/reveal', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({game_id:gameId, r, c})});
    return res.json();
  }

  async function apiFlag(r,c){
    const res = await fetch('/api/minesweeper/flag', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({game_id:gameId, r, c})});
    return res.json();
  }

  function render(board){
    const root = qs('#minesweeper-root');
    root.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'ms-grid';
    // set CSS variables for number of columns/rows so the CSS can adapt responsively
    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--rows', rows);
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        const b = document.createElement('button');
        b.className = 'ms-cell';
        b.dataset.r = r; b.dataset.c = c;
        if(cell.state === 'revealed'){
          b.classList.add('revealed');
          if(cell.value === 'mine'){
            b.textContent = '💣';
            b.classList.add('mine');
          } else {
            b.textContent = cell.value === 0 ? '' : cell.value;
            if(typeof cell.value === 'number' && cell.value > 0){
              b.dataset.number = cell.value;
            }
          }
        } else if(cell.state === 'flagged'){
          b.classList.add('flagged'); b.textContent = '🚩';
        } else {
          b.textContent = '';
        }

        b.addEventListener('click', async (e) => {
          if(!gameId) return;
          const rr = parseInt(b.dataset.r), cc = parseInt(b.dataset.c);
          const j = await apiReveal(rr, cc);
          updateFromResponse(j);
        });

        b.addEventListener('contextmenu', async (e) => {
          e.preventDefault();
          if(!gameId) return;
          const rr = parseInt(b.dataset.r), cc = parseInt(b.dataset.c);
          const j = await apiFlag(rr, cc);
          updateFromResponse(j);
        });

        grid.appendChild(b);
      })
    });
    root.appendChild(grid);
    // configure the persistent wrapper container if present
    const wrapperEl = qs('#ms-container');
    if(wrapperEl){
      // apply difficulty class
      wrapperEl.className = `ms-wrapper ${currentLevel}`;
      // expose cols/rows on wrapper for any layout needs
      wrapperEl.style.setProperty('--cols', cols);
      wrapperEl.style.setProperty('--rows', rows);
      // set aspect ratio so board shape is natural
      try{ wrapperEl.style.aspectRatio = `${cols} / ${rows}`; }catch(e){}
    }
    // update mines left display and wrapper aspect to match board
    const minesEl = qs('#ms-mines');
    if(minesEl){
      minesEl.textContent = `Mines: ${minesTotal}`;
    }
    // set wrapper aspect ratio so wide boards use width first
    try{
      wrap.style.aspectRatio = `${cols} / ${rows}`;
    }catch(e){}
  }

  function countFlags(board){
    let f = 0;
    board.forEach(r => r.forEach(c => { if(c.state === 'flagged') f++; }));
    return f;
  }

  function updateFromResponse(j){
    if(j.error){ qs('#ms-status').textContent = j.error; return; }
    if(j.rows) { rows = j.rows; cols = j.cols; }
    if(j.mines) { minesTotal = j.mines; }
    if(j.status) qs('#ms-status').textContent = `Status: ${j.status}`;
    if(j.board){ render(j.board); const flags = countFlags(j.board); const minesLeftEl = qs('#ms-mines'); if(minesLeftEl) minesLeftEl.textContent = `Mines: ${Math.max(0, minesTotal - flags)}`; if(j.status === 'ongoing' && !timer) startTimer(); if(j.status !== 'ongoing') stopTimer(); }
  }

  async function newGame(){
    const level = qs('#ms-level').value;
    const j = await apiNew(level);
    if(j.game_id){
      gameId = j.game_id; rows = j.rows; cols = j.cols; minesTotal = j.mines || 0;
      currentLevel = level;
      // update wrapper class immediately
      const wrapperEl = qs('#ms-container');
      if(wrapperEl) wrapperEl.className = `ms-wrapper ${currentLevel}`;
      qs('#ms-status').textContent = 'Status: ' + j.status;
      qs('#ms-mines').textContent = `Mines: ${minesTotal}`;
      // reset timer on new game
      stopTimer(); seconds = 0; qs('#ms-timer').textContent = 'Time: 0s';
      render((new Array(rows)).fill(0).map(()=> new Array(cols).fill({state:'covered', value:null})));
      // start timer when first reveal happens (server marks ongoing)
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    qs('#ms-new').addEventListener('click', newGame);
    // start default game
    newGame();
  });

})();
