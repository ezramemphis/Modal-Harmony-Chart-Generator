// Patch Notes toggle
const patchNotes = document.getElementById('patch-notes');
const patchToggle = document.getElementById('patch-toggle');
patchToggle.addEventListener('click', () => {
  patchNotes.classList.toggle('open');
  patchToggle.textContent = patchNotes.classList.contains('open') ? 'Patch Notes ⯆' : 'Patch Notes ⯈';
});
