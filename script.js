// Конфігурація додатку
const CONFIG = {
    MAX_MESSAGES: 200,
    AUTO_SAVE_INTERVAL: 30000,
    EMOJIS: {
        faces: ['😀', '😂', '😊', '😎', '🤔', '😍', '🥳', '😜', '🤩', '😇', '🙂', '😋', '🤗', '😴', '🤓'],
        animals: ['🐶', '🐱', '🦊', '🐯', '🦁', '🐼', '🐨', '🐸', '🐵', '🐮', '🐷', '🐔'],
        objects: ['📚', '✏️', '🎒', '🏫', '📱', '💻', '🎮', '⚽', '🎨', '🎵', '🎬'],
        symbols: ['❤️', '🔥', '⭐', '🎉', '👍', '👏', '🙌', '🤝', '💪', '✨', '🌟']
    }
};

// Стан додатку
const state = {
    currentUser: null,
    currentClass: null,
    messages: [],
    onlineUsers: [],
    currentPage: 'chat',
    theme: localStorage.getItem('classmate_theme') || 'light',
    typingUsers: new Set(),
    images: []
};

// Клас для управління додатком
class ClassMateApp {
    constructor() {
        this.init();
    }

    async init() {
        this.setupUI();
        this.setupEventListeners();
        this.loadState();
        this.updateDateTime();
        this.setupDateTimeUpdater();
        
        // Перевірка, чи потрібно показувати модальне вікно входу
        if (!state.currentUser) {
            setTimeout(() => this.showLoginModal(), 500);
        } else {
            this.updateUserUI();
        }
    }

    setupUI() {
        // Встановлення теми
        document.documentElement.setAttribute('data-theme', state.theme);
        this.updateThemeIcon();
        
        // Встановлення поточної дати
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('diaryDate').value = today;
        document.getElementById('diaryDate').max = today;
        
        // Заповнення емодзі
        this.populateEmojis();
        
        // Оновлення статистики
        this.updateStats();
    }

    setupEventListeners() {
        console.log('Налаштування обробників подій...');
        
        // Навігація між сторінками
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                console.log('Перехід на сторінку:', page);
                this.switchPage(page);
            });
        });

        // Тема
        document.getElementById('themeToggle').addEventListener('click', () => {
            console.log('Перемикання теми');
            this.toggleTheme();
        });

        // Чат
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            this.updateTypingIndicator();
        });

        // Очищення чату
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            if (confirm('Ви впевнені, що хочете очистити весь чат?')) {
                state.messages = [];
                this.renderMessages();
                this.saveState();
                this.showNotification('Чат очищено', 'success');
            }
        });

        // Завантаження зображень
        document.getElementById('imageUploadBtn').addEventListener('click', () => {
            document.getElementById('imageUploadInput').click();
        });

        document.getElementById('imageUploadInput').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0]);
        });

        // Емодзі
        document.getElementById('emojiBtn').addEventListener('click', (e) => {
            this.toggleEmojiPanel(e.currentTarget);
        });

        document.querySelectorAll('.emoji-cat').forEach(cat => {
            cat.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.cat;
                this.showEmojiCategory(category);
            });
        });

        // Логін
        document.getElementById('loginSubmit').addEventListener('click', () => this.handleLogin());
        
        document.getElementById('loginName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        // Закриття модальних вікон
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });

        // Клік поза модальним вікном
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Щоденник
        document.getElementById('addEntryBtn')?.addEventListener('click', () => {
            this.showEntryModal();
        });

        document.getElementById('firstEntryBtn')?.addEventListener('click', () => {
            this.showEntryModal();
        });

        // Навігація по датах щоденника
        document.getElementById('prevDayBtn')?.addEventListener('click', () => {
            this.changeDiaryDate(-1);
        });

        document.getElementById('nextDayBtn')?.addEventListener('click', () => {
            this.changeDiaryDate(1);
        });

        document.getElementById('diaryDate')?.addEventListener('change', (e) => {
            this.loadDiaryEntries(e.target.value);
        });

        // Вибір аватара
        document.querySelectorAll('.avatar-choice').forEach(choice => {
            choice.addEventListener('click', (e) => {
                document.querySelectorAll('.avatar-choice').forEach(c => c.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
            });
        });

        // Теги для щоденника
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.currentTarget.dataset.tag;
                this.showNotification(`Тег "${tag}" додано до фільтра`, 'info');
            });
        });

        console.log('Обробники подій успішно налаштовані');
    }

    loadState() {
        console.log('Завантаження стану...');
        
        // Завантаження користувача
        const savedUser = localStorage.getItem('classmate_user');
        if (savedUser) {
            try {
                state.currentUser = JSON.parse(savedUser);
                state.currentClass = localStorage.getItem('classmate_class');
                
                // Завантаження повідомлень
                const savedMessages = localStorage.getItem('classmate_messages');
                if (savedMessages) {
                    state.messages = JSON.parse(savedMessages);
                }
                
                // Завантаження зображень
                const savedImages = localStorage.getItem('classmate_images');
                if (savedImages) {
                    state.images = JSON.parse(savedImages);
                }
                
                console.log('Стан завантажено:', state.currentUser);
                this.updateUserUI();
                this.renderMessages();
                
            } catch (e) {
                console.error('Помилка завантаження стану:', e);
                state.currentUser = null;
            }
        }

        // Демо-користувачі онлайн
        state.onlineUsers = [
            { id: 1, name: 'Софія', avatar: '👩‍🎓', status: 'online', lastSeen: Date.now() },
            { id: 2, name: 'Максим', avatar: '👨‍🎓', status: 'online', lastSeen: Date.now() - 30000 },
            { id: 3, name: 'Анна', avatar: '🦊', status: 'away', lastSeen: Date.now() - 120000 },
            { id: 4, name: 'Олексій', avatar: '🐯', status: 'offline', lastSeen: Date.now() - 300000 }
        ];
        
        this.updateOnlineUsers();
    }

    saveState() {
        if (state.currentUser) {
            localStorage.setItem('classmate_user', JSON.stringify(state.currentUser));
            localStorage.setItem('classmate_class', state.currentClass);
            localStorage.setItem('classmate_messages', JSON.stringify(state.messages));
            localStorage.setItem('classmate_images', JSON.stringify(state.images));
            localStorage.setItem('classmate_theme', state.theme);
        }
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateString = now.toLocaleDateString('uk-UA', options);
        document.getElementById('currentDate').textContent = dateString;
    }

    setupDateTimeUpdater() {
        setInterval(() => this.updateDateTime(), 60000);
    }

    showLoginModal() {
        console.log('Показ модального вікна входу');
        const modal = document.getElementById('loginModal');
        modal.style.display = 'flex';
        
        // Автозаповнення демо-даних
        document.getElementById('loginName').value = 'Софія Коваленко';
        document.getElementById('loginClass').value = '11-А';
        
        // Вибираємо перший аватар за замовчуванням
        const firstAvatar = document.querySelector('.avatar-choice');
        if (firstAvatar) {
            document.querySelectorAll('.avatar-choice').forEach(c => c.classList.remove('selected'));
            firstAvatar.classList.add('selected');
        }
    }

    hideLoginModal() {
        document.getElementById('loginModal').style.display = 'none';
    }

    handleLogin() {
        const name = document.getElementById('loginName').value.trim();
        const className = document.getElementById('loginClass').value;
        const avatar = document.querySelector('.avatar-choice.selected')?.dataset.avatar || '👤';

        if (!name) {
            this.showNotification('Будь ласка, введіть ваше ім\'я', 'warning');
            return;
        }

        if (!className) {
            this.showNotification('Будь ласка, оберіть клас', 'warning');
            return;
        }

        state.currentUser = {
            id: Date.now(),
            name: name,
            avatar: avatar,
            lastSeen: Date.now()
        };

        state.currentClass = className;

        // Оновлення UI
        this.updateUserUI();
        this.hideLoginModal();

        // Додаємо вітальне повідомлення
        this.addSystemMessage(`${name} приєднався до чату класу ${className}`);

        // Збереження
        this.saveState();

        this.showNotification(`Вітаємо, ${name}!`, 'success');
        console.log('Користувач увійшов:', state.currentUser);
    }

    updateUserUI() {
        if (!state.currentUser) return;

        document.getElementById('userName').textContent = state.currentUser.name;
        document.getElementById('userClass').textContent = state.currentClass || 'Клас не обрано';
        document.getElementById('userAvatar').textContent = state.currentUser.avatar;
        
        console.log('UI користувача оновлено');
    }

    switchPage(page) {
        console.log('Перемикання на сторінку:', page);
        
        // Оновлюємо активну кнопку навігації
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.dataset.page === page;
            btn.classList.toggle('active', isActive);
            
            // Оновлюємо стилі для темної теми
            if (state.theme === 'dark' && isActive) {
                btn.style.color = 'white';
            }
        });

        // Оновлюємо активну сторінку
        document.querySelectorAll('.page').forEach(pageElement => {
            const isActive = pageElement.id === `${page}Page`;
            pageElement.classList.toggle('active', isActive);
            pageElement.style.display = isActive ? 'block' : 'none';
        });

        // Оновлюємо заголовок
        const titles = {
            chat: 'Чат класу',
            diary: 'Електронний щоденник',
            schedule: 'Розклад занять',
            homework: 'Домашні завдання',
            grades: 'Оцінки та статистика'
        };

        const subtitles = {
            chat: 'Спілкуйтесь та обмінюйтесь інформацією',
            diary: 'Записуйте свої думки та події',
            schedule: 'Перегляд розкладу занять',
            homework: 'Управління домашніми завданнями',
            grades: 'Моніторинг успішності'
        };

        document.getElementById('pageTitle').textContent = titles[page] || '';
        document.getElementById('pageSubtitle').textContent = subtitles[page] || '';

        state.currentPage = page;
        
        // Якщо це сторінка щоденника, оновлюємо записи
        if (page === 'diary') {
            this.loadDiaryEntries();
        }
        
        console.log('Сторінка активована:', page);
    }

    toggleTheme() {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        this.updateThemeIcon();
        this.saveState();
        
        // Оновлюємо кнопки навігації для темної теми
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (state.theme === 'dark' && btn.classList.contains('active')) {
                btn.style.color = 'white';
            }
        });
        
        this.showNotification(`Тема змінена на ${state.theme === 'light' ? 'світлу' : 'темну'}`, 'info');
    }

    updateThemeIcon() {
        const icon = document.getElementById('themeToggle').querySelector('i');
        icon.className = state.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();

        if (!text) {
            this.showNotification('Введіть текст повідомлення', 'warning');
            return;
        }

        if (!state.currentUser) {
            this.showNotification('Будь ласка, увійдіть до системи', 'warning');
            return;
        }

        const message = {
            id: Date.now(),
            userId: state.currentUser.id,
            user: state.currentUser.name,
            avatar: state.currentUser.avatar,
            text: text,
            timestamp: Date.now(),
            type: 'my'
        };

        this.addMessage(message);
        input.value = '';
        
        // Скидаємо індикатор набору
        state.typingUsers.delete(state.currentUser.id);
        this.updateTypingIndicator();

        // Оновлюємо активність
        state.lastActivity = Date.now();
        this.saveState();
        
        console.log('Повідомлення відправлено:', message);
    }

    addMessage(message) {
        state.messages.push(message);
        
        if (state.messages.length > CONFIG.MAX_MESSAGES) {
            state.messages.shift();
        }

        this.renderMessages();
        this.updateStats();
    }

    addSystemMessage(text) {
        const message = {
            id: Date.now(),
            user: 'Система',
            avatar: '📢',
            text: text,
            timestamp: Date.now(),
            type: 'system'
        };

        this.addMessage(message);
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        // Фільтруємо тільки повідомлення користувачів
        const userMessages = state.messages.filter(msg => msg.type !== 'system');
        
        // Оновлюємо статистику
        document.getElementById('messageCount').textContent = userMessages.length;
        
        // Якщо немає повідомлень, показуємо вітальне повідомлення
        if (userMessages.length === 0 && !state.messages.some(msg => msg.type === 'system')) {
            container.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon">
                        <i class="fas fa-graduation-cap"></i>
                    </div>
                    <h3>Ласкаво просимо до чату класу!</h3>
                    <p>Це безпечний простір для спілкування однокласників</p>
                    <div class="welcome-tips">
                        <div class="tip">
                            <i class="fas fa-shield-alt"></i>
                            <span>Приватний чат тільки для вашого класу</span>
                        </div>
                        <div class="tip">
                            <i class="fas fa-images"></i>
                            <span>Додавайте зображення та файли</span>
                        </div>
                        <div class="tip">
                            <i class="fas fa-smile"></i>
                            <span>Використовуйте емодзі та стикери</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Рендеримо всі повідомлення
        container.innerHTML = '';
        
        state.messages.forEach(msg => {
            const messageElement = this.createMessageElement(msg);
            container.appendChild(messageElement);
        });

        // Прокручуємо донизу
        container.scrollTop = container.scrollHeight;
    }

    createMessageElement(msg) {
        const div = document.createElement('div');
        div.className = `message ${msg.type}`;
        
        const time = new Date(msg.timestamp).toLocaleTimeString('uk-UA', {
            hour: '2-digit',
            minute: '2-digit'
        });

        let content = msg.text;
        
        // Якщо це зображення
        if (msg.imageUrl) {
            content = `<img src="${msg.imageUrl}" alt="Зображення" onclick="app.showImageModal('${msg.imageUrl}')">`;
        }

        div.innerHTML = `
            <div class="message-header">
                <div class="message-avatar">${msg.avatar}</div>
                <span class="message-sender">${msg.user}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-bubble">
                <div class="message-content">${this.formatMessage(content)}</div>
            </div>
        `;

        return div;
    }

    formatMessage(text) {
        // Простий форматтер для посилань та емодзі
        return text
            .replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`)
            .replace(/\n/g, '<br>');
    }

    updateTypingIndicator() {
        if (!state.currentUser) return;

        const input = document.getElementById('messageInput');
        const indicator = document.getElementById('typingIndicator');
        
        if (input.value.trim()) {
            state.typingUsers.add(state.currentUser.id);
        } else {
            state.typingUsers.delete(state.currentUser.id);
        }

        if (state.typingUsers.size > 0) {
            const names = Array.from(state.typingUsers)
                .map(id => {
                    const user = state.onlineUsers.find(u => u.id === id) || state.currentUser;
                    return user.name;
                });
            
            if (names.length === 1) {
                indicator.textContent = `${names[0]} друкує...`;
            } else if (names.length === 2) {
                indicator.textContent = `${names[0]} та ${names[1]} друкують...`;
            } else {
                indicator.textContent = `${names.length} користувачі друкують...`;
            }
        } else {
            indicator.textContent = '';
        }
    }

    handleImageUpload(file) {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showNotification('Будь ласка, виберіть зображення', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB
            this.showNotification('Зображення занадто велике (макс. 5MB)', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            
            // Додаємо зображення в стан
            state.images.push({
                id: Date.now(),
                url: imageUrl,
                name: file.name,
                timestamp: Date.now(),
                userId: state.currentUser.id
            });
            
            // Створюємо повідомлення з зображенням
            const message = {
                id: Date.now(),
                userId: state.currentUser.id,
                user: state.currentUser.name,
                avatar: state.currentUser.avatar,
                imageUrl: imageUrl,
                text: `📎 ${file.name}`,
                timestamp: Date.now(),
                type: 'my'
            };
            
            this.addMessage(message);
            this.saveState();
            this.showNotification('Зображення завантажено', 'success');
        };
        
        reader.readAsDataURL(file);
        
        // Скидаємо input
        document.getElementById('imageUploadInput').value = '';
    }

    showImageModal(imageUrl) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 3000;
            animation: fadeIn 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div class="image-modal-content">
                <img src="${imageUrl}" style="max-width: 90vw; max-height: 90vh; border-radius: 10px;">
                <button class="close-image-modal" style="
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    font-size: 2rem;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    cursor: pointer;
                ">&times;</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('.close-image-modal').addEventListener('click', () => {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => modal.remove(), 300);
            }
        });
    }

    toggleEmojiPanel(button) {
        const panel = document.getElementById('emojiPanel');
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        
        if (panel.style.display === 'block') {
            const rect = button.getBoundingClientRect();
            panel.style.bottom = `${window.innerHeight - rect.top + 10}px`;
            panel.style.right = `${window.innerWidth - rect.right}px`;
        }
    }

    populateEmojis() {
        const grid = document.getElementById('emojiGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        CONFIG.EMOJIS.faces.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.addEventListener('click', () => {
                const input = document.getElementById('messageInput');
                input.value += emoji;
                input.focus();
                document.getElementById('emojiPanel').style.display = 'none';
            });
            grid.appendChild(span);
        });
    }

    showEmojiCategory(category) {
        const grid = document.getElementById('emojiGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        if (CONFIG.EMOJIS[category]) {
            CONFIG.EMOJIS[category].forEach(emoji => {
                const span = document.createElement('span');
                span.textContent = emoji;
                span.addEventListener('click', () => {
                    const input = document.getElementById('messageInput');
                    input.value += emoji;
                    input.focus();
                    document.getElementById('emojiPanel').style.display = 'none';
                });
                grid.appendChild(span);
            });
        }

        // Оновлюємо активну категорію
        document.querySelectorAll('.emoji-cat').forEach(cat => {
            cat.classList.toggle('active', cat.dataset.cat === category);
        });
    }

    showEntryModal() {
        const modal = document.getElementById('entryModal');
        const body = document.getElementById('entryModalBody');
        
        const today = new Date().toISOString().split('T')[0];
        
        body.innerHTML = `
            <div class="form-group">
                <label for="entryDate">
                    <i class="fas fa-calendar"></i> Дата
                </label>
                <input type="date" id="entryDate" value="${today}" max="${today}">
            </div>
            <div class="form-group">
                <label for="entryMood">
                    <i class="fas fa-smile"></i> Настрій
                </label>
                <div class="mood-selector" style="display: flex; gap: 10px; justify-content: center;">
                    <button type="button" class="mood-btn" data-mood="1" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #e5e7eb; background: white; font-size: 1.5rem; cursor: pointer;">😢</button>
                    <button type="button" class="mood-btn" data-mood="2" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #e5e7eb; background: white; font-size: 1.5rem; cursor: pointer;">😔</button>
                    <button type="button" class="mood-btn" data-mood="3" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #e5e7eb; background: white; font-size: 1.5rem; cursor: pointer;">😐</button>
                    <button type="button" class="mood-btn" data-mood="4" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #e5e7eb; background: white; font-size: 1.5rem; cursor: pointer;">🙂</button>
                    <button type="button" class="mood-btn" data-mood="5" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #e5e7eb; background: white; font-size: 1.5rem; cursor: pointer;">😊</button>
                </div>
                <input type="hidden" id="selectedMood" value="3">
            </div>
            <div class="form-group">
                <label for="entryText">
                    <i class="fas fa-edit"></i> Запис
                </label>
                <textarea id="entryText" rows="6" placeholder="Опишіть свій день, події, думки..."></textarea>
            </div>
            <div class="form-group">
                <label>
                    <i class="fas fa-tags"></i> Теги
                </label>
                <div class="tags-selector" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="button" class="tag-option" data-tag="школа" style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 20px; background: white; cursor: pointer;">🏫 Школа</button>
                    <button type="button" class="tag-option" data-tag="домашка" style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 20px; background: white; cursor: pointer;">📚 Домашка</button>
                    <button type="button" class="tag-option" data-tag="друзі" style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 20px; background: white; cursor: pointer;">👫 Друзі</button>
                    <button type="button" class="tag-option" data-tag="спорт" style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 20px; background: white; cursor: pointer;">⚽ Спорт</button>
                    <button type="button" class="tag-option" data-tag="відпочинок" style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 20px; background: white; cursor: pointer;">🎮 Відпочинок</button>
                </div>
                <input type="hidden" id="selectedTags" value="">
            </div>
            <button class="btn-submit" id="saveEntryBtn">
                <i class="fas fa-save"></i> Зберегти запис
            </button>
        `;

        // Додаємо обробники подій
        body.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                body.querySelectorAll('.mood-btn').forEach(b => {
                    b.style.borderColor = '#e5e7eb';
                    b.style.background = 'white';
                });
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.background = '#6366f1';
                e.currentTarget.style.color = 'white';
                body.querySelector('#selectedMood').value = e.currentTarget.dataset.mood;
            });
        });

        body.querySelectorAll('.tag-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('selected');
                if (e.currentTarget.classList.contains('selected')) {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.background = '#6366f1';
                    e.currentTarget.style.color = 'white';
                } else {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = 'inherit';
                }
                
                const tags = Array.from(body.querySelectorAll('.tag-option.selected'))
                    .map(b => b.dataset.tag)
                    .join(',');
                body.querySelector('#selectedTags').value = tags;
            });
        });

        // Встановлюємо за замовчуванням
        body.querySelector('.mood-btn[data-mood="3"]').click();
        
        body.querySelector('#saveEntryBtn').addEventListener('click', () => {
            this.saveDiaryEntry();
            modal.style.display = 'none';
        });

        modal.style.display = 'flex';
    }

    saveDiaryEntry() {
        const date = document.getElementById('entryDate').value;
        const mood = document.getElementById('selectedMood').value;
        const text = document.getElementById('entryText').value.trim();
        const tags = document.getElementById('selectedTags').value.split(',').filter(t => t.trim());

        if (!text) {
            this.showNotification('Будь ласка, введіть текст запису', 'warning');
            return;
        }

        // Зберігаємо запис у localStorage
        const entries = JSON.parse(localStorage.getItem('classmate_diary_entries') || '[]');
        const newEntry = {
            id: Date.now(),
            date: date,
            mood: parseInt(mood),
            text: text,
            tags: tags,
            createdAt: new Date().toISOString()
        };
        
        entries.push(newEntry);
        localStorage.setItem('classmate_diary_entries', JSON.stringify(entries));
        
        this.showNotification('Запис збережено', 'success');
        this.loadDiaryEntries();
    }

    loadDiaryEntries(date = null) {
        if (!date) {
            date = document.getElementById('diaryDate').value || new Date().toISOString().split('T')[0];
        }
        
        const entries = JSON.parse(localStorage.getItem('classmate_diary_entries') || '[]');
        const filteredEntries = entries.filter(entry => entry.date === date);
        
        const container = document.getElementById('entriesContainer');
        if (!container) return;
        
        if (filteredEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-book"></i>
                    </div>
                    <h3>Ще немає записів на цей день</h3>
                    <p>Натисніть "Додати запис", щоб почати вести щоденник</p>
                    <button class="btn-outline" id="firstEntryBtn">
                        <i class="fas fa-feather-alt"></i> Створити перший запис
                    </button>
                </div>
            `;
            
            // Додаємо обробник події
            container.querySelector('#firstEntryBtn')?.addEventListener('click', () => {
                this.showEntryModal();
            });
        } else {
            container.innerHTML = filteredEntries.map(entry => this.createDiaryEntryElement(entry)).join('');
        }
        
        // Оновлюємо статистику
        this.updateDiaryStats();
    }

    createDiaryEntryElement(entry) {
        const moodEmojis = ['😢', '😔', '😐', '🙂', '😊'];
        const moodEmoji = moodEmojis[entry.mood - 1] || '😐';
        
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('uk-UA', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        const tagsHtml = entry.tags.map(tag => `
            <span class="tag" style="padding: 5px 12px; background: rgba(99, 102, 241, 0.1); color: #6366f1; border-radius: 20px; font-size: 0.85rem; margin-right: 5px;">${tag}</span>
        `).join('');

        return `
            <div class="entry-card" style="background: var(--card-bg); border-radius: var(--radius); padding: 25px; margin-bottom: 20px; box-shadow: var(--shadow-md); border-left: 4px solid #6366f1;">
                <div class="entry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div class="entry-date" style="font-weight: 600; color: #6366f1; font-size: 1.1rem;">${dateStr}</div>
                    <div class="entry-mood" style="font-size: 1.5rem;">${moodEmoji}</div>
                </div>
                <div class="entry-content" style="color: var(--dark); line-height: 1.6; margin-bottom: 15px;">
                    ${entry.text.replace(/\n/g, '<br>')}
                </div>
                <div class="entry-tags" style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                    ${tagsHtml}
                </div>
                <div class="entry-footer" style="font-size: 0.85rem; color: var(--gray);">
                    <small>${new Date(entry.createdAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
            </div>
        `;
    }

    changeDiaryDate(delta) {
        const dateInput = document.getElementById('diaryDate');
        const currentDate = new Date(dateInput.value);
        currentDate.setDate(currentDate.getDate() + delta);
        
        const newDate = currentDate.toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        
        if (newDate <= today) {
            dateInput.value = newDate;
            this.loadDiaryEntries(newDate);
        }
    }

    updateDiaryStats() {
        const entries = JSON.parse(localStorage.getItem('classmate_diary_entries') || '[]');
        
        // Загальна кількість записів
        document.getElementById('entriesCount').textContent = entries.length;
        
        // Дні поспіль
        const streak = this.calculateStreak(entries);
        document.getElementById('streakDays').textContent = streak;
        
        // Досягнення (просто для прикладу)
        document.getElementById('achievements').textContent = Math.floor(entries.length / 3);
        
        // Середній настрій
        const avgMood = this.calculateAverageMood(entries);
        document.getElementById('moodRating').textContent = avgMood.toFixed(1);
    }

    calculateStreak(entries) {
        if (entries.length === 0) return 0;
        
        const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
        let streak = 0;
        let currentDate = new Date();
        
        for (let i = 0; i < dates.length; i++) {
            const entryDate = new Date(dates[i]);
            const diffDays = Math.floor((currentDate - entryDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === i) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    calculateAverageMood(entries) {
        if (entries.length === 0) return 5.0;
        
        const lastWeek = entries.filter(entry => {
            const entryDate = new Date(entry.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return entryDate >= weekAgo;
        });
        
        if (lastWeek.length === 0) return 5.0;
        
        const sum = lastWeek.reduce((acc, entry) => acc + entry.mood, 0);
        return sum / lastWeek.length;
    }

    updateStats() {
        // Оновлення статистики онлайн
        const onlineCount = state.onlineUsers.filter(u => u.status === 'online').length;
        const onlineCountElement = document.getElementById('onlineCount');
        if (onlineCountElement) {
            onlineCountElement.textContent = onlineCount;
        }
        
        // Оновлення списку користувачів
        this.updateOnlineUsers();
    }

    updateOnlineUsers() {
        const grid = document.getElementById('usersGrid');
        if (!grid) return;

        grid.innerHTML = '';
        
        state.onlineUsers.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            
            const lastSeen = Math.floor((Date.now() - user.lastSeen) / 60000);
            let statusText = 'offline';
            let statusClass = 'offline';
            
            if (user.status === 'online') {
                statusText = 'онлайн';
                statusClass = 'online';
            } else if (user.status === 'away') {
                statusText = `був ${lastSeen} хв тому`;
                statusClass = 'away';
            } else {
                statusText = `останній раз ${lastSeen} хв тому`;
                statusClass = 'offline';
            }
            
            card.innerHTML = `
                <div class="user-card-avatar">${user.avatar}</div>
                <div class="user-card-name">${user.name}</div>
                <div class="user-card-status ${statusClass}" style="color: ${statusClass === 'online' ? '#10b981' : statusClass === 'away' ? '#f59e0b' : '#9ca3af'}">${statusText}</div>
            `;
            
            grid.appendChild(card);
        });
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'times-circle' : 
                              type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        // Автоматичне видалення сповіщення
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Додаємо стилі для анімацій
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .image-modal {
        animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Ініціалізація додатку
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ClassMateApp();
    console.log('ClassMate додаток ініціалізовано!');
});

// ===== P2P CHAT (WebRTC) =====
let peer = new Peer();
let conn = null;

// HTML
const messagesContainer = document.querySelector(".messages-container");
const textarea = document.querySelector("textarea");
const sendBtn = document.querySelector(".send-btn");

// Імʼя
let username = localStorage.getItem("chatName");
if (!username) {
  username = prompt("Введи своє імʼя:");
  localStorage.setItem("chatName", username);
}

// Показати свій ID
peer.on("open", id => {
  alert("Твій код кімнати:\n" + id);
});

// Прийом підключення
peer.on("connection", connection => {
  conn = connection;
  setupConnection();
});

// Підключення до друга
const friendId = prompt("Введи код кімнати друга (або залиш пусто):");
if (friendId) {
  conn = peer.connect(friendId);
  conn.on("open", setupConnection);
}

function setupConnection() {
  conn.on("data", data => {
    renderMessage(data.name, data.text, false);
  });
}

// Надсилання
sendBtn.onclick = sendMessage;
textarea.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = textarea.value.trim();
  if (!text || !conn) return;

  const msg = { name: username, text };
  conn.send(msg);
  renderMessage(username, text, true);
  textarea.value = "";
}

// Відображення
function renderMessage(name, text, mine) {
  const div = document.createElement("div");
  div.className = "message " + (mine ? "my" : "other");

  div.innerHTML = `
    <div class="message-bubble">
      <div class="message-header">
        <strong>${name}</strong>
      </div>
      <div class="message-content">${text}</div>
    </div>
  `;

  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
