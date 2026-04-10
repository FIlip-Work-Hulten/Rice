const btn = document.getElementById('button');
let clickCount = 0;

if (btn) {
	btn.addEventListener('click', () => {
		clickCount += 1;
		const time = new Date().toLocaleTimeString();
		alert(`Example alert #${clickCount}\nButton clicked at ${time}`);
	});
} else {
	console.warn('Button with id "button" not found.');
}