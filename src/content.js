function showNotification(message) {
    let existing = document.getElementById('url-copy-notif');
    if (existing) {
        existing.style.animation = 'blink 0.3s';
        setTimeout(() => {
            existing.style.animation = '';
        }, 300);
        return;
    }

    const notif = document.createElement('div');
    notif.id = 'url-copy-notif';
    notif.textContent = message;
    Object.assign(notif.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(51, 51, 51, 0.8)',
        color: '#fff',
        padding: '10px 15px',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'sans-serif',
        zIndex: 9999,
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out'
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notif);
    requestAnimationFrame(() => {
        notif.style.opacity = '1';
    });

    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 1500);
}

document.addEventListener('keydown', function(event) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmd = isMac ? event.metaKey : event.ctrlKey;

    if (cmd && event.shiftKey && event.code === 'KeyC') {
        event.preventDefault();
        event.stopImmediatePropagation();

        navigator.clipboard.writeText(window.location.href)
            .then(() => {
                console.log("URL copied!");
                showNotification("🔗 URL copied to clipboard!");
            })
            .catch(err => console.error("Copy failed:", err));
    }
}, true);