// script.js — cleaned, fixes #4, diatonic spellings, correct avoid chords

const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const ENHARMONIC_MAP = { 'E#':'F','B#':'C','Cb':'B','Fb':'E' };

// normalize input note
function normalizeInput(note){
  if(!note) return null;
  note = note.trim();
  const m = note.match(/^([A-Ga-g])([#b])?$/);
  if(!m) return null;
  const base = m[1].toUpperCase() + (m[2] || '');
  return ENHARMONIC_MAP[base] || base;
}

// chromatic index
function pcIndex(name){
  let i = SHARP.indexOf(name);
  if(i !== -1) return i;
  return FLAT.indexOf(name);
}

// all spellings by semitone
const NAMES_BY_INDEX = [
  ['C'], ['C#','Db'], ['D'], ['D#','Eb'], ['E'], ['F'],
  ['F#','Gb'], ['G'], ['G#','Ab'], ['A'], ['A#','Bb'], ['B']
];

// add semitones
function addSemis(i,s){ return (i+s+12)%12; }

// expected letter sequence from root letter
function expectedLettersFrom(rootLetter){
  const letters = ['A','B','C','D','E','F','G'];
  const start = letters.indexOf(rootLetter);
  const seq = [];
  for(let i=0;i<7;i++) seq.push(letters[(start+i)%7]);
  return seq;
}

// pick spelling for semitone
function pickNameForIndex(index, expectedLetter=null, preferFlat=false, requestedAccidental=null){
  index = (index+12)%12;
  const candidates = NAMES_BY_INDEX[index];
  if(requestedAccidental==='b') for(const c of candidates) if(c.includes('b')) return c;
  if(requestedAccidental==='#') for(const c of candidates) if(c.includes('#')) return c;
  if(expectedLetter) for(const c of candidates) if(c[0]===expectedLetter) return c;
  if(preferFlat) for(const c of candidates) if(c.includes('b')) return c;
  for(const c of candidates) return c; // fallback
}

// build spelled scale
function buildSpelledScale(rootIdx, steps, preferFlat){
  const rootName = preferFlat ? FLAT[rootIdx] : SHARP[rootIdx];
  const rootLetter = rootName[0];
  const expectedLetters = expectedLettersFrom(rootLetter);
  const scale = [];
  for(let i=0;i<7;i++){
    const semis = addSemis(rootIdx, steps[i]);
    scale.push(pickNameForIndex(semis, expectedLetters[i], preferFlat));
  }
  return scale;
}

// modes
const modes = {
  Dorian:     { steps:[0,2,3,5,7,9,10], char:'6',  preferFlat:true },
  Phrygian:   { steps:[0,1,3,5,7,8,10], char:'b2', preferFlat:true },
  Lydian:     { steps:[0,2,4,6,7,9,11], char:'#4', preferFlat:false },
  Mixolydian: { steps:[0,2,4,5,7,9,10], char:'b7', preferFlat:false },
  Aeolian:    { steps:[0,2,3,5,7,8,10], char:'b6', preferFlat:true }
};

// tonic chord
const tonicQuality = {
  Dorian:'-7', Phrygian:'-7', Lydian:'Maj7', Mixolydian:'7', Aeolian:'-7'
};

// characteristic chords
const characteristicMap = {
  Dorian: [
    {deg:'II', quality:'-7'},
    {deg:'IV', quality:'7'},
    {deg:'♭VII', quality:'Maj7', asterisk:true}
  ],
  Phrygian: [
    {deg:'♭VII', quality:'-7'},
    {deg:'♭III', quality:'7', asterisk:true},
    {deg:'♭VI', quality:'Maj7'}
  ],
  Lydian: [
    {deg:'VI', quality:'-7', asterisk:true},
    {deg:'II', quality:'7'},
    {deg:'V', quality:'Maj7'}
  ],
  Mixolydian: [
    {deg:'V', quality:'-7', asterisk:true},
    {deg:'I', quality:'7'},
    {deg:'IV', quality:'Maj7'}
  ],
  Aeolian: [
    {deg:'IV', quality:'-7'},
    {deg:'♭VII', quality:'7'},
    {deg:'♭III', quality:'Maj7', asterisk:true}
  ]
};

// roman numeral semitones
const romanSemis = {
  'I':0,'II':2,'III':4,'IV':5,'V':7,'VI':9,'VII':11,
  '♭II':1,'♭III':3,'♭VI':8,'♭VII':10,'#IV':6
};

// get note from roman numeral
function getNoteByRoman(rootIdx, symbol, preferFlat){
  if(!(symbol in romanSemis)) return '?';
  const target = addSemis(rootIdx, romanSemis[symbol]);
  const acc = symbol.includes('b')?'b':symbol.includes('#')?'#':null;
  const lettersOrder = {'I':0,'II':1,'III':2,'IV':3,'V':4,'VI':5,'VII':6,'♭II':1,'♭III':2,'♭VI':5,'♭VII':6,'#IV':3};
  const expectedLetter = expectedLettersFrom((preferFlat?FLAT[rootIdx]:SHARP[rootIdx])[0])[lettersOrder[symbol]%7];
  return pickNameForIndex(target, expectedLetter, preferFlat, acc);
}

// characteristic note REALLY make sure this is working. 

function resolveCharacteristic(rootIdx, meta){
  const scale = buildSpelledScale(rootIdx, meta.steps, meta.preferFlat);

  // Map mode to the 0-based index of its characteristic degree
  const characteristicDegreeIndex = {
    Dorian: 5,      // 6th degree → index 5
    Phrygian: 1,    // 2nd degree → index 1
    Lydian: 3,      // 4th degree → index 3
    Mixolydian: 6,  // 7th degree → index 6
    Aeolian: 5      // 6th degree → index 5
  };

  const idx = characteristicDegreeIndex[Object.keys(modes).find(key => modes[key] === meta)];
  return scale[idx];
}


// render all
function render(rootInput){
  const root = normalizeInput(rootInput);
  if(!root){ alert('Enter a note like C, F#, Bb'); return; }
  const rootIdx = pcIndex(root);
  if(rootIdx<0){ alert('Unrecognized note'); return; }

  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const avoidMapping = {
    Dorian:'VI', Phrygian:'V', Lydian:'#IV', Mixolydian:'III', Aeolian:'II'
  };

  for(const [modeName, meta] of Object.entries(modes)){
    const preferFlat = meta.preferFlat || root.includes('b') || ['Bb','Eb','Ab','Db','Gb','Cb'].includes(root);

    const scale = buildSpelledScale(rootIdx, meta.steps, preferFlat);
    const charNote = resolveCharacteristic(rootIdx, meta);

    const avoidSym = avoidMapping[modeName];
    const avoidRoot = getNoteByRoman(rootIdx, avoidSym, preferFlat);
    const avoidLabel = `${avoidRoot} -7(b5)`;

    const charList = characteristicMap[modeName].map(ch=>{
      const note = getNoteByRoman(rootIdx, ch.deg, preferFlat);
      const asterisk = ch.asterisk?'*':'';
      return `<span class="chord"><span class="rnum">${ch.deg}${asterisk}</span><span class="name">${note} ${ch.quality}</span></span>`;
    }).join('');

    const headerLabel = `${root} ${modeName}`;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="mode-head">
        <div>
          <div class="mode-title">${headerLabel}</div>
          <div class="small" style="margin-top:4px;color:var(--muted)">
            Scale: <span class="note">${scale.join(' • ')}</span>
          </div>
        </div>
        <div class="badge">${modeName}</div>
      </div>

      <div class="section">
        <div class="line"><div class="label">Mode:</div><div class="value">${modeName}</div></div>
        <div class="line"><div class="label">Characteristic note (${meta.char}):</div><div class="value">${charNote}</div></div>
        <div class="line"><div class="label">Tonic chord:</div><div class="value">${root}${tonicQuality[modeName]}</div></div>

      </div>

      <div class="section">
        <div class="label">Characteristic chords</div>
        <div style="margin-top:8px;">${charList}</div>
      </div>

      <div class="section">
        <div class="line"><div class="label">Avoid chord:</div><div class="value">${avoidSym} — ${avoidLabel}</div></div>
        <div class="hint small" style="margin-top:8px;">Avoid to preserve ${modeName} focus.</div>
      </div>
    `;
    grid.appendChild(card);
  }
}

// UI wiring
document.getElementById('go').addEventListener('click', ()=> render(document.getElementById('root').value || 'C'));
document.getElementById('root').addEventListener('keydown', e=> { if(e.key==='Enter') render(document.getElementById('root').value || 'C'); });

// initial render
render(document.getElementById('root').value || 'C');
