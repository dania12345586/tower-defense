window._selectedTowers = [];

export function initMenu() {
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('towerSelectMenu').style.display = 'flex';
        });
    }

    document.querySelectorAll('.tower-card').forEach(card => {
        const checkbox = card.querySelector('.tower-checkbox');
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('help-btn')) return;
            checkbox.checked = !checkbox.checked;
            card.classList.toggle('selected', checkbox.checked);
        });
        if (checkbox.checked) card.classList.add('selected');
    });

    document.getElementById('towerSelectNextBtn').addEventListener('click', () => {
        const checked = document.querySelectorAll('.tower-checkbox:checked');
        if (checked.length === 0) {
            alert('Выберите хотя бы одну башню!');
            return;
        }
        window._selectedTowers = Array.from(checked).map(cb => cb.value);
        document.getElementById('towerSelectMenu').style.display = 'none';
        document.getElementById('mapSelectMenu').style.display = 'flex';
    });

    document.querySelectorAll('.map-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            card.querySelector('input[type="radio"]').checked = true;
        });
    });
}

export function getSelectedTowers() {
    return window._selectedTowers || [];
}