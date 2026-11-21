const views = ['home','setup','quiz','result','leaderboard'];
const state = { name:'', category:'All', questions:[], index:0, selected:null, answers:[] };
const $ = id => document.getElementById(id);
function showView(name) {
  views.forEach(v => $(v+'View').classList.toggle('hidden', v !== name));
  document.querySelectorAll('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === name || (name === 'setup' && b.dataset.view === 'home')));
  window.scrollTo({top:0, behavior:'smooth'});
  if (name === 'leaderboard') loadLeaderboard();
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => showView(b.dataset.back)));
$('brandHome').addEventListener('click', e => {e.preventDefault();showView('home')});
$('startBtn').addEventListener('click', () => showView('setup'));
$('leaderboardShortcut').addEventListener('click', () => showView('leaderboard'));
let selectedCategory = 'All';
document.querySelectorAll('.category-card').forEach(card => card.addEventListener('click', () => {
  document.querySelectorAll('.category-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected'); selectedCategory = card.dataset.category;
}));
$('beginBtn').addEventListener('click', startQuiz);
$('playerName').addEventListener('keydown', e => { if(e.key === 'Enter') startQuiz(); });
async function startQuiz() {
  const name = $('playerName').value.trim();
  if (!name) { $('setupError').textContent = 'Please enter your name to continue.'; $('playerName').focus(); return; }
  $('setupError').textContent = '';
  $('beginBtn').disabled = true; $('beginBtn').textContent = 'Loading questions…';
  try {
    const response = await fetch('/api/questions?category='+encodeURIComponent(selectedCategory));
    const data = await response.json();
    if (data.error || !data.questions?.length) throw new Error(data.error || 'No questions found for this category.');
    state.name = name.slice(0,32); state.category = selectedCategory; state.questions = data.questions; state.index = 0; state.answers = []; state.selected = null;
    $('quizPlayer').textContent = state.name; $('playerInitial').textContent = state.name.charAt(0).toUpperCase();
    $('quizCategory').textContent = selectedCategory === 'All' ? 'MIXED CATEGORY' : selectedCategory.toUpperCase();
    renderQuestion(); showView('quiz');
  } catch (err) { $('setupError').textContent = err.message || 'Unable to start the quiz. Please try again.'; }
  finally { $('beginBtn').disabled = false; $('beginBtn').innerHTML = 'Let\'s play <span>↗</span>'; }
}
function renderQuestion() {
  const q = state.questions[state.index]; const total = state.questions.length;
  $('questionCount').textContent = `QUESTION ${String(state.index+1).padStart(2,'0')} / ${total}`;
  $('progressPercent').textContent = `${Math.round((state.index+1)/total*100)}%`;
  $('progressBar').style.width = `${(state.index+1)/total*100}%`;
  $('questionText').textContent = q.question; $('difficultyLabel').textContent = q.difficulty.toUpperCase();
  $('nextBtn').disabled = true; $('nextBtn').innerHTML = state.index === total-1 ? 'Finish quiz <span>↗</span>' : 'Next question <span>→</span>';
  $('answerGrid').innerHTML = '';
  q.options.forEach((option,i) => {
    const btn = document.createElement('button'); btn.className = 'answer-option';
    const letter = document.createElement('span'); letter.className = 'letter'; letter.textContent = 'ABCD'[i];
    const text = document.createElement('span'); text.textContent = option;
    btn.append(letter,text); btn.addEventListener('click', () => {
      document.querySelectorAll('.answer-option').forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected'); state.selected = 'ABCD'[i]; $('nextBtn').disabled = false;
    }); $('answerGrid').appendChild(btn);
  });
}
$('nextBtn').addEventListener('click', async () => {
  if (!state.selected) return;
  state.answers.push(`${state.questions[state.index].id}:${state.selected}`); state.selected = null;
  if (state.index < state.questions.length-1) { state.index++; renderQuestion(); }
  else await finishQuiz();
});
$('quitBtn').addEventListener('click', () => { if(confirm('Leave this quiz? Your current round will not be saved.')) showView('home'); });
async function finishQuiz() {
  $('nextBtn').disabled = true; $('nextBtn').textContent = 'Saving score…';
  try {
    const response = await fetch('/api/finish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:state.name,category:state.category,answers:state.answers.join(',')})});
    const data = await response.json(); if (data.error) throw new Error(data.error);
    $('scoreValue').textContent = `${data.score}/${data.total}`; $('accuracyValue').textContent = `${data.percentage}%`;
    $('correctValue').textContent = data.score; $('totalValue').textContent = data.total;
    $('scoreRing').style.background = `conic-gradient(var(--gold) ${data.percentage*3.6}deg,#34394a 0deg)`;
    $('resultHeading').textContent = data.percentage === 100 ? 'Flawless work!' : data.percentage >= 70 ? 'Nicely done.' : data.percentage >= 40 ? 'Good effort.' : 'Keep going.';
    $('resultSub').textContent = `You scored ${data.score} out of ${data.total}, ${state.name}.`;
    $('saveNote').textContent = 'Your score has been saved to the leaderboard.'; showView('result');
  } catch(err) { alert(err.message || 'Could not save your score.'); showView('home'); }
  finally { $('nextBtn').disabled = false; }
}
$('playAgainBtn').addEventListener('click', () => showView('setup'));
async function loadLeaderboard() {
  const target = $('leaderboardRows'); target.innerHTML = '<div class="empty-state">Loading scores…</div>';
  try {
    const response = await fetch('/api/leaderboard'); const data = await response.json();
    if (!data.scores?.length) { target.innerHTML = '<div class="empty-state">No scores yet. Be the first to play!</div>'; return; }
    target.innerHTML = '';
    data.scores.forEach((p,i) => {
      const row = document.createElement('div'); row.className = 'leader-row';
      const name = document.createElement('div'); name.className = 'leader-name';
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = i+1;
      const player = document.createElement('span'); player.textContent = p.name; name.append(rank,player);
      const category = document.createElement('span'); category.className = 'leader-category'; category.textContent = p.category;
      const score = document.createElement('span'); score.className = 'leader-score'; score.textContent = `${p.score}/${p.total}`;
      row.append(name,category,score); target.appendChild(row);
    });
  } catch { target.innerHTML = '<div class="empty-state">Could not load leaderboard. Please refresh.</div>'; }
}
