const btn = document.getElementById('button');

if (btn) {
	btn.addEventListener('click', () => {
		alert(`Example alert Button clicked`);
	});
} else {
	console.warn('Button with id "button" not found.');
}