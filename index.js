const btn = document.getElementById('button');

if (btn) {
	btn.addEventListener('click', () => {
		alert(`Example alert Button clicked`);
	});
} else {
	console.warn('Button with id "button" not found.');
}

const btn2 = document.getElementById('button2');

if (btn2) {
    btn2.addEventListener('click', () => {
        window.location.href = 'https://www.youtube.com';
    });
} else {
    console.warn('Button with id "button2" not found.');
}