// ============================================
// DENIZ - Hayat Planlayıcı
// ============================================

// ========== DATA LAYER ==========
const DB = {
    get(key, fallback = null) {
        try {
            const val = localStorage.getItem('deniz_' + key);
            return val ? JSON.parse(val) : fallback;
        } catch { return fallback; }
    },
    set(key, val) {
        localStorage.setItem('deniz_' + key, JSON.stringify(val));
    },
    remove(key) {
        localStorage.removeItem('deniz_' + key);
    }
};

// ========== STATE ==========
let state = {
    events: DB.get('events', []),
    tasks: DB.get('tasks', []),
    journal: DB.get('journal', []),
    settings: DB.get('settings', {
        name: 'Deniz',
        wakeUp: '07:00',
        sleep: '23:00',
        courses: ['Ders 1', 'Ders 2', 'Ders 3'],
        goals: { school: 20, home: 14, kids: 21, social: 5, selfcare: 7, shopping: 3 },
        theme: 'light',
        dailyReminder: true,
        deadlineAlert: true
    }),
    currentMonth: new Date(),
    currentWeek: new Date(),
    selectedDay: null,
    currentJournalId: null,
    currentFilter: 'all',
    calView: 'month',
    statsPeriod: 'week',
    editingEventId: null
};

function save() {
    DB.set('events', state.events);
    DB.set('tasks', state.tasks);
    DB.set('journal', state.journal);
    DB.set('settings', state.settings);
}

// ========== SEED: Sabah Rutini (Hafta içi) ==========
function seedMorningRoutine() {
    const tag = 'sabah-rutini';
    if (state.events.some(e => e.seedTag === tag)) return; // zaten eklendi

    const today = new Date();
    for (let i = 0; i < 56; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const day = d.getDay();
        if (day >= 1 && day <= 5) { // Pzt-Cum
            state.events.push({
                id: genId(),
                title: 'Sabah Rutini',
                category: 'kids',
                type: 'event',
                date: formatDate(d),
                duration: 0.92,
                startTime: '07:15',
                endTime: '08:10',
                priority: 'high',
                note: 'Kahvaltı hazırla, lunch pack hazırla, çocukları uyandır & giydir, okula götür',
                seedTag: tag
            });
        }
    }
    save();
}

// ========== CATEGORIES ==========
const CATEGORIES = {
    school: { label: 'Okul', icon: '📚', color: '#6c5ce7' },
    home: { label: 'Ev İşleri', icon: '🏠', color: '#00b894' },
    kids: { label: 'Çocuklar', icon: '👶', color: '#fd79a8' },
    social: { label: 'Sosyal', icon: '💬', color: '#0984e3' },
    selfcare: { label: 'Öz Bakım', icon: '🧘', color: '#e17055' },
    shopping: { label: 'Alışveriş', icon: '🛒', color: '#fdcb6e' }
};

const MOODS = {
    great: '😊',
    good: '🙂',
    neutral: '😐',
    tired: '😴',
    stressed: '😰',
    sad: '😢'
};

const QUOTES = [
    '"Her gün yeni bir başlangıçtır."',
    '"Küçük adımlar büyük yolculuklar başlatır."',
    '"Kendine zaman ayırmak bencillik değil, gerekliliktir."',
    '"Mükemmel olmak zorunda değilsin, tutarlı ol yeter."',
    '"Bugün yapabileceklerinin en iyisini yap."',
    '"Planlı yaşam, huzurlu yaşamdır."',
    '"Sen her şeyi yapabilirsin, ama her şeyi aynı anda değil."',
    '"İlerleme, mükemmellikten daha önemlidir."',
    '"Nefes al. Bir adım at. Devam et."',
    '"Güçlü kadınlar plan yapar, hayal kurar ve başarır."'
];

const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// ========== ALL ITEMS (events + tasks merged) ==========
function getAllItems() {
    return [
        ...state.events,
        ...state.tasks.map(t => ({ ...t, type: 'task' }))
    ];
}

function getItemsForDate(dateStr) {
    return getAllItems().filter(e => e.date === dateStr);
}

// ========== UTILITY ==========
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDate(d) {
    return d.toISOString().split('T')[0];
}

function formatDateTR(d) {
    const date = new Date(d);
    return `${date.getDate()} ${MONTHS_TR[date.getMonth()]} ${date.getFullYear()}`;
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function getWeekStart(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function getWeekDays(d) {
    const start = getWeekStart(d);
    return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        return day;
    });
}

function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}

// ========== NAVIGATION ==========
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        navigateTo(page);
    });
});

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    // Render page
    renderPage(page);
}

function renderPage(page) {
    switch (page) {
        case 'dashboard': renderDashboard(); break;
        case 'calendar': renderCalendar(); break;
        case 'weekly': renderWeekly(); break;
        case 'tasks': renderTasks(); break;
        case 'journal': renderJournal(); break;
        case 'stats': renderStats(); break;
        case 'settings': renderSettings(); break;
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ========== DASHBOARD ==========
function renderDashboard() {
    // Greeting
    const hour = new Date().getHours();
    let greet = 'İyi Akşamlar';
    if (hour < 12) greet = 'Günaydın';
    else if (hour < 18) greet = 'İyi Günler';
    document.getElementById('greeting').textContent = `${greet}, ${state.settings.name}!`;

    const now = new Date();
    document.getElementById('dateDisplay').textContent = `${DAYS_TR[now.getDay()]}, ${now.getDate()} ${MONTHS_TR[now.getMonth()]} ${now.getFullYear()}`;

    // Quote
    document.getElementById('dailyQuote').textContent = QUOTES[now.getDate() % QUOTES.length];

    // Category hours this week
    const weekStart = getWeekStart(now);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekItems = getAllItems().filter(e => {
        const d = new Date(e.date);
        return d >= weekStart && d < weekEnd;
    });

    const hours = {};
    Object.keys(CATEGORIES).forEach(cat => hours[cat] = 0);
    weekItems.forEach(e => {
        if (hours[e.category] !== undefined) {
            hours[e.category] += (e.duration || 0);
        }
    });

    Object.keys(CATEGORIES).forEach(cat => {
        const goal = state.settings.goals[cat] || 1;
        const h = hours[cat] || 0;
        const pct = Math.min(100, (h / goal) * 100);
        const elHours = document.getElementById(cat + 'Hours');
        const elBar = document.getElementById(cat + 'Bar');
        if (elHours) elHours.textContent = h.toFixed(1) + 's';
        if (elBar) elBar.style.width = pct + '%';
    });

    // Today's timeline
    const todayStr = formatDate(now);
    const todayEvents = getItemsForDate(todayStr)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const timeline = document.getElementById('todayTimeline');
    if (todayEvents.length === 0) {
        timeline.innerHTML = '<p class="empty-state">Bugün için henüz plan eklenmemiş</p>';
    } else {
        timeline.innerHTML = todayEvents.map(e => `
            <div class="timeline-item">
                <span class="timeline-time">${e.startTime || '--:--'}</span>
                <div class="timeline-dot" style="background:${CATEGORIES[e.category]?.color || '#999'}"></div>
                <div class="timeline-content">
                    <h4>${escapeHtml(e.title)}</h4>
                    <p>${CATEGORIES[e.category]?.label || ''} · ${e.duration || 0}s</p>
                </div>
                <div class="timeline-actions">
                    <button onclick="editEvent('${e.id}')" title="Düzenle">✏️</button>
                    <button onclick="deleteEvent('${e.id}')" title="Sil">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    // Upcoming tasks
    const upcomingTasks = state.tasks
        .filter(t => t.status !== 'done')
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .slice(0, 5);

    const tasksEl = document.getElementById('upcomingTasks');
    if (upcomingTasks.length === 0) {
        tasksEl.innerHTML = '<p class="empty-state">Tüm görevler tamamlandı!</p>';
    } else {
        tasksEl.innerHTML = upcomingTasks.map(t => `
            <div class="upcoming-task-item">
                <div class="task-check ${t.status === 'done' ? 'checked' : ''}" onclick="toggleTask('${t.id}')"></div>
                <div class="task-info">
                    <h4>${escapeHtml(t.title)}</h4>
                    <p>${CATEGORIES[t.category]?.icon || ''} ${t.date ? formatDateTR(t.date) : ''}</p>
                </div>
                <div class="priority-dot ${t.priority}"></div>
            </div>
        `).join('');
    }

    // Courses
    const coursesEl = document.getElementById('coursesList');
    coursesEl.innerHTML = state.settings.courses
        .filter(c => c.trim())
        .map(c => `
            <div class="course-item">
                <div class="course-dot"></div>
                <span>${escapeHtml(c)}</span>
            </div>
        `).join('');
}

// ========== CALENDAR ==========
function renderCalendar() {
    if (state.calView === 'month') renderMonthView();
    else if (state.calView === 'week') renderCalWeekView();
    else renderCalDayView();
}

function renderMonthView() {
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    document.getElementById('calendarMonth').textContent = `${MONTHS_TR[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay();
    if (startDay === 0) startDay = 7;
    startDay--;

    const today = new Date();
    let html = '<div class="calendar-header-row">';
    ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].forEach(d => {
        html += `<div class="calendar-header-cell">${d}</div>`;
    });
    html += '</div><div class="calendar-body">';

    // Previous month days
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
        const dayNum = prevLastDay - i;
        html += `<div class="calendar-cell other-month"><div class="cell-date">${dayNum}</div></div>`;
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const dateStr = formatDate(date);
        const isToday = isSameDay(date, today);
        const dayEvents = getItemsForDate(dateStr);

        html += `<div class="calendar-cell ${isToday ? 'today' : ''}" onclick="openDayDetail('${dateStr}')">`;
        html += `<div class="cell-date">${d}</div>`;
        html += '<div class="cell-events">';

        const maxShow = 3;
        dayEvents.slice(0, maxShow).forEach(e => {
            const label = e.type === 'task' ? '☑ ' : '';
            html += `<div class="cell-event cat-${e.category}">${label}${escapeHtml(e.title)}</div>`;
        });
        if (dayEvents.length > maxShow) {
            html += `<div class="cell-more">+${dayEvents.length - maxShow} daha</div>`;
        }

        html += '</div></div>';
    }

    // Next month days
    const totalCells = startDay + lastDay.getDate();
    const remaining = (7 - totalCells % 7) % 7;
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="calendar-cell other-month"><div class="cell-date">${i}</div></div>`;
    }

    html += '</div>';
    document.getElementById('calendarGrid').innerHTML = html;
}

function renderCalWeekView() {
    const days = getWeekDays(state.currentMonth);
    document.getElementById('calendarMonth').textContent =
        `${days[0].getDate()} ${MONTHS_TR[days[0].getMonth()]} - ${days[6].getDate()} ${MONTHS_TR[days[6].getMonth()]} ${days[6].getFullYear()}`;

    let html = '<div class="calendar-header-row">';
    const today = new Date();
    days.forEach(d => {
        const isToday = isSameDay(d, today);
        html += `<div class="calendar-header-cell" style="${isToday ? 'background:var(--accent);color:white;' : ''}">${DAYS_SHORT[d.getDay()]} ${d.getDate()}</div>`;
    });
    html += '</div><div class="calendar-body">';
    days.forEach(d => {
        const dateStr = formatDate(d);
        const dayEvents = getItemsForDate(dateStr);
        html += `<div class="calendar-cell" style="min-height:150px;" onclick="openDayDetail('${dateStr}')">`;
        html += '<div class="cell-events">';
        dayEvents.forEach(e => {
            const label = e.type === 'task' ? '☑ ' : '';
            html += `<div class="cell-event cat-${e.category}">${e.startTime || ''} ${label}${escapeHtml(e.title)}</div>`;
        });
        html += '</div></div>';
    });
    html += '</div>';
    document.getElementById('calendarGrid').innerHTML = html;
}

function renderCalDayView() {
    const d = state.currentMonth;
    document.getElementById('calendarMonth').textContent = `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}, ${DAYS_TR[d.getDay()]}`;

    const dateStr = formatDate(d);
    const dayEvents = getItemsForDate(dateStr).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    let html = '<div style="padding:20px;">';
    if (dayEvents.length === 0) {
        html += '<p class="empty-state">Bu gün için etkinlik yok</p>';
    } else {
        dayEvents.forEach(e => {
            const typeLabel = e.type === 'task' ? ' [Görev]' : '';
            html += `
                <div class="detail-event" style="border-left-color:${CATEGORIES[e.category]?.color || '#999'};margin-bottom:10px;">
                    <div class="detail-event-info">
                        <h4>${CATEGORIES[e.category]?.icon || ''} ${escapeHtml(e.title)}${typeLabel}</h4>
                        <p>${e.startTime || '--:--'} - ${e.endTime || '--:--'} · ${e.duration || 0} saat</p>
                        ${e.note ? `<p style="margin-top:4px;">${escapeHtml(e.note)}</p>` : ''}
                    </div>
                    <div class="detail-event-actions">
                        <button onclick="editEvent('${e.id}')">✏️</button>
                        <button onclick="deleteEvent('${e.id}')">🗑️</button>
                    </div>
                </div>`;
        });
    }
    html += '</div>';
    document.getElementById('calendarGrid').innerHTML = html;
}

function setCalView(view) {
    state.calView = view;
    document.querySelectorAll('[data-calview]').forEach(b => b.classList.toggle('active', b.dataset.calview === view));
    renderCalendar();
}

function changeMonth(dir) {
    if (state.calView === 'day') {
        state.currentMonth.setDate(state.currentMonth.getDate() + dir);
    } else if (state.calView === 'week') {
        state.currentMonth.setDate(state.currentMonth.getDate() + dir * 7);
    } else {
        state.currentMonth.setMonth(state.currentMonth.getMonth() + dir);
    }
    renderCalendar();
}

function openDayDetail(dateStr) {
    state.selectedDay = dateStr;
    const panel = document.getElementById('dayDetailPanel');
    panel.style.display = 'block';
    document.getElementById('dayDetailTitle').textContent = formatDateTR(dateStr);

    const dayEvents = getItemsForDate(dateStr).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const el = document.getElementById('dayDetailEvents');

    if (dayEvents.length === 0) {
        el.innerHTML = '<p class="empty-state">Bu gün boş</p>';
    } else {
        el.innerHTML = dayEvents.map(e => {
            const typeLabel = e.type === 'task' ? ' ☑' : '';
            return `
            <div class="detail-event" style="border-left-color:${CATEGORIES[e.category]?.color || '#999'}">
                <div class="detail-event-info">
                    <h4>${CATEGORIES[e.category]?.icon || ''} ${escapeHtml(e.title)}${typeLabel}</h4>
                    <p>${e.startTime || '--:--'} - ${e.endTime || '--:--'} · ${e.duration || 0}s</p>
                </div>
                <div class="detail-event-actions">
                    <button onclick="editEvent('${e.id}')">✏️</button>
                    <button onclick="deleteEvent('${e.id}')">🗑️</button>
                </div>
            </div>`;
        }).join('');
    }
}

function closeDayDetail() {
    document.getElementById('dayDetailPanel').style.display = 'none';
}

function addEventToDay() {
    closeDayDetail();
    openQuickAdd();
    if (state.selectedDay) {
        document.getElementById('eventDate').value = state.selectedDay;
    }
}

// ========== WEEKLY PLAN ==========
function renderWeekly() {
    const days = getWeekDays(state.currentWeek);
    const today = new Date();

    document.getElementById('weekLabel').textContent =
        `${days[0].getDate()} ${MONTHS_TR[days[0].getMonth()]} - ${days[6].getDate()} ${MONTHS_TR[days[6].getMonth()]}`;

    let html = '';
    // Header row
    html += '<div class="weekly-header"></div>';
    days.forEach(d => {
        const isToday = isSameDay(d, today);
        html += `<div class="weekly-header ${isToday ? 'today-header' : ''}">
            <div class="day-name">${DAYS_SHORT[d.getDay()]}</div>
            <div class="day-num">${d.getDate()}</div>
        </div>`;
    });

    // Time slots (6:00 - 23:00)
    for (let h = 6; h <= 23; h++) {
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        html += `<div class="weekly-time">${timeStr}</div>`;
        days.forEach(d => {
            const dateStr = formatDate(d);
            html += `<div class="weekly-cell" onclick="quickAddWeekly('${dateStr}','${timeStr}')">`;

            // Find events and tasks that start at this hour
            const cellEvents = getAllItems().filter(e => {
                if (e.date !== dateStr || !e.startTime) return false;
                const eHour = parseInt(e.startTime.split(':')[0]);
                return eHour === h;
            });

            cellEvents.forEach(e => {
                const dur = e.duration || 1;
                const height = dur * 48 - 4;
                const label = e.type === 'task' ? '☑ ' : '';
                html += `<div class="weekly-event cat-${e.category}" style="height:${height}px;top:0;" onclick="event.stopPropagation();editEvent('${e.id}')">${label}${escapeHtml(e.title)}</div>`;
            });

            html += '</div>';
        });
    }

    document.getElementById('weeklyGrid').innerHTML = html;
}

function changeWeek(dir) {
    state.currentWeek.setDate(state.currentWeek.getDate() + dir * 7);
    renderWeekly();
}

function quickAddWeekly(date, time) {
    openQuickAdd();
    document.getElementById('eventDate').value = date;
    document.getElementById('eventStart').value = time;
    const endH = parseInt(time.split(':')[0]) + 1;
    document.getElementById('eventEnd').value = `${endH.toString().padStart(2, '0')}:00`;
}

// ========== TASKS ==========
function renderTasks() {
    const filter = state.currentFilter;
    const tasks = filter === 'all' ? state.tasks : state.tasks.filter(t => t.category === filter);

    const todo = tasks.filter(t => t.status === 'todo');
    const inProgress = tasks.filter(t => t.status === 'inprogress');
    const done = tasks.filter(t => t.status === 'done');

    document.getElementById('tasksTodo').innerHTML = todo.map(t => taskCardHtml(t)).join('') || '<p class="empty-state" style="padding:12px;">Boş</p>';
    document.getElementById('tasksInProgress').innerHTML = inProgress.map(t => taskCardHtml(t)).join('') || '<p class="empty-state" style="padding:12px;">Boş</p>';
    document.getElementById('tasksDone').innerHTML = done.map(t => taskCardHtml(t)).join('') || '<p class="empty-state" style="padding:12px;">Boş</p>';
}

function taskCardHtml(t) {
    return `
        <div class="task-card" draggable="true" data-id="${t.id}">
            <div class="task-card-header">
                <h4>${escapeHtml(t.title)}</h4>
                <span class="task-card-category">${CATEGORIES[t.category]?.icon || ''}</span>
            </div>
            ${t.note ? `<p>${escapeHtml(t.note)}</p>` : ''}
            <div class="task-card-footer">
                <span class="task-card-date">${t.date ? formatDateTR(t.date) : ''}</span>
                <div class="task-card-actions">
                    ${t.status !== 'todo' ? `<button onclick="moveTask('${t.id}','back')" title="Geri">◀</button>` : ''}
                    ${t.status !== 'done' ? `<button onclick="moveTask('${t.id}','forward')" title="İleri">▶</button>` : ''}
                    <button onclick="deleteTask('${t.id}')" title="Sil">🗑️</button>
                </div>
            </div>
        </div>`;
}

function filterTasks(filter) {
    state.currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    renderTasks();
}

function moveTask(id, dir) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    const order = ['todo', 'inprogress', 'done'];
    const idx = order.indexOf(t.status);
    if (dir === 'forward' && idx < 2) t.status = order[idx + 1];
    if (dir === 'back' && idx > 0) t.status = order[idx - 1];
    save();
    renderTasks();
    renderDashboard();
}

function toggleTask(id) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    t.status = t.status === 'done' ? 'todo' : 'done';
    save();
    renderDashboard();
}

function deleteTask(id) {
    if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;
    state.tasks = state.tasks.filter(t => t.id !== id);
    save();
    renderTasks();
    renderDashboard();
    toast('Görev silindi');
}

function openTaskModal() {
    state.editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Yeni Görev';
    document.getElementById('eventType').value = 'task';
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventCategory').value = 'school';
    document.getElementById('eventDate').value = formatDate(new Date());
    document.getElementById('eventDuration').value = '1';
    document.getElementById('eventStart').value = '';
    document.getElementById('eventEnd').value = '';
    document.getElementById('eventPriority').value = 'medium';
    document.getElementById('eventNote').value = '';
    document.getElementById('modalOverlay').style.display = 'flex';
}

// ========== JOURNAL ==========
function renderJournal() {
    const list = document.getElementById('journalList');
    const sorted = [...state.journal].sort((a, b) => b.date.localeCompare(a.date));

    if (sorted.length === 0) {
        list.innerHTML = '<p class="empty-state">Henüz günlük girişi yok</p>';
    } else {
        list.innerHTML = sorted.map(j => `
            <div class="journal-entry-item ${state.currentJournalId === j.id ? 'active' : ''}" onclick="loadJournalEntry('${j.id}')">
                <span class="entry-mood">${MOODS[j.mood] || ''}</span>
                <h4>${escapeHtml(j.title || 'Başlıksız')}</h4>
                <span class="entry-date">${formatDateTR(j.date)}</span>
                <p class="entry-preview">${escapeHtml((j.content || '').substring(0, 80))}</p>
            </div>
        `).join('');
    }

    if (state.currentJournalId) {
        loadJournalEntry(state.currentJournalId);
    } else if (sorted.length > 0) {
        // Giriş varsa en sonuncuyu aç
        loadJournalEntry(sorted[0].id);
    }
}

function newJournalEntry() {
    const entry = {
        id: genId(),
        title: '',
        content: '',
        date: formatDate(new Date()),
        mood: '',
        tags: []
    };
    state.journal.push(entry);
    state.currentJournalId = entry.id;
    save();
    renderJournal();
    loadJournalEntry(entry.id);
}

function loadJournalEntry(id) {
    const entry = state.journal.find(j => j.id === id);
    if (!entry) return;
    state.currentJournalId = id;

    document.getElementById('journalTitle').value = entry.title || '';
    document.getElementById('journalContent').value = entry.content || '';
    document.getElementById('journalDate').textContent = formatDateTR(entry.date);
    document.getElementById('journalMood').value = entry.mood || '';
    renderJournalTags(entry.tags || []);

    // Update active state in list
    document.querySelectorAll('.journal-entry-item').forEach(el => {
        el.classList.toggle('active', el.onclick.toString().includes(id));
    });
}

function renderJournalTags(tags) {
    const container = document.getElementById('journalTags');
    container.innerHTML = tags.map(t => `
        <span class="tag">${escapeHtml(t)} <span class="remove-tag" onclick="removeTag('${escapeHtml(t)}')">&times;</span></span>
    `).join('');
}

function addTag() {
    const input = document.getElementById('tagInput');
    const tag = input.value.trim();
    if (!tag) return;

    const entry = state.journal.find(j => j.id === state.currentJournalId);
    if (!entry) return;

    if (!entry.tags) entry.tags = [];
    if (!entry.tags.includes(tag)) {
        entry.tags.push(tag);
        save();
        renderJournalTags(entry.tags);
    }
    input.value = '';
}

function removeTag(tag) {
    const entry = state.journal.find(j => j.id === state.currentJournalId);
    if (!entry || !entry.tags) return;
    entry.tags = entry.tags.filter(t => t !== tag);
    save();
    renderJournalTags(entry.tags);
}

function saveJournalEntry() {
    let entry = state.journal.find(j => j.id === state.currentJournalId);

    // Eğer aktif giriş yoksa otomatik oluştur
    if (!entry) {
        entry = {
            id: genId(),
            title: '',
            content: '',
            date: formatDate(new Date()),
            mood: '',
            tags: []
        };
        state.journal.push(entry);
        state.currentJournalId = entry.id;
    }

    entry.title = document.getElementById('journalTitle').value || 'Başlıksız';
    entry.content = document.getElementById('journalContent').value;
    entry.mood = document.getElementById('journalMood').value;
    save();
    renderJournal();
    toast('Günlük kaydedildi');
}

// ========== STATS ==========
function renderStats() {
    const now = new Date();
    let events, tasks, journals;

    if (state.statsPeriod === 'week') {
        const weekStart = getWeekStart(now);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        events = state.events.filter(e => { const d = new Date(e.date); return d >= weekStart && d < weekEnd; });
        tasks = state.tasks.filter(t => { const d = new Date(t.date); return d >= weekStart && d < weekEnd; });
        journals = state.journal.filter(j => { const d = new Date(j.date); return d >= weekStart && d < weekEnd; });
    } else if (state.statsPeriod === 'month') {
        events = state.events.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
        tasks = state.tasks.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
        journals = state.journal.filter(j => { const d = new Date(j.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    } else {
        events = state.events;
        tasks = state.tasks;
        journals = state.journal;
    }

    // Total hours (events + tasks)
    const allItems = [...events, ...tasks];
    const totalHours = allItems.reduce((sum, e) => sum + (e.duration || 0), 0);
    document.getElementById('statTotalHours').textContent = totalHours.toFixed(1);

    // Completed tasks
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    document.getElementById('statCompletedTasks').textContent = completedTasks;

    // Journal entries
    document.getElementById('statJournalEntries').textContent = journals.length;

    // Productivity
    const allTasks = tasks.length;
    const productivity = allTasks > 0 ? Math.round((completedTasks / allTasks) * 100) : 0;
    document.getElementById('statProductivity').textContent = productivity + '%';

    // Category pie chart
    const catHours = {};
    Object.keys(CATEGORIES).forEach(cat => catHours[cat] = 0);
    allItems.forEach(e => { if (catHours[e.category] !== undefined) catHours[e.category] += (e.duration || 0); });
    const maxCatHour = Math.max(...Object.values(catHours), 1);

    document.getElementById('categoryPieChart').innerHTML = Object.keys(CATEGORIES).map(cat => `
        <div class="pie-item">
            <div class="pie-color" style="background:${CATEGORIES[cat].color}"></div>
            <span class="pie-label">${CATEGORIES[cat].icon} ${CATEGORIES[cat].label}</span>
            <div class="pie-bar-bg">
                <div class="pie-bar-fill" style="width:${(catHours[cat]/maxCatHour)*100}%;background:${CATEGORIES[cat].color}"></div>
            </div>
            <span class="pie-value">${catHours[cat].toFixed(1)}s</span>
        </div>
    `).join('');

    // Weekly bar chart
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const weekStart = getWeekStart(now);
    const dayHours = days.map((_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        const dateStr = formatDate(d);
        return getItemsForDate(dateStr).reduce((sum, e) => sum + (e.duration || 0), 0);
    });
    const maxDayHour = Math.max(...dayHours, 1);

    document.getElementById('weeklyBarChart').innerHTML = days.map((day, i) => `
        <div class="bar-group">
            <div class="bar" style="height:${(dayHours[i]/maxDayHour)*160}px;background:var(--accent);"></div>
            <span class="bar-label">${day}<br>${dayHours[i].toFixed(1)}s</span>
        </div>
    `).join('');

    // Mood chart
    const moodCounts = {};
    Object.keys(MOODS).forEach(m => moodCounts[m] = 0);
    journals.forEach(j => { if (j.mood && moodCounts[j.mood] !== undefined) moodCounts[j.mood]++; });
    const maxMood = Math.max(...Object.values(moodCounts), 1);

    document.getElementById('moodChart').innerHTML = Object.keys(MOODS).map(m => `
        <div class="mood-row">
            <span class="mood-emoji">${MOODS[m]}</span>
            <div class="mood-bar-bg">
                <div class="mood-bar-fill" style="width:${(moodCounts[m]/maxMood)*100}%"></div>
            </div>
            <span class="mood-count">${moodCounts[m]}</span>
        </div>
    `).join('');
}

function setStatsPeriod(period) {
    state.statsPeriod = period;
    document.querySelectorAll('.stats-period .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderStats();
}

// ========== SETTINGS ==========
function renderSettings() {
    const s = state.settings;
    document.getElementById('settingName').value = s.name || '';
    document.getElementById('settingWakeUp').value = s.wakeUp || '07:00';
    document.getElementById('settingSleep').value = s.sleep || '23:00';
    document.getElementById('goalSchool').value = s.goals.school;
    document.getElementById('goalHome').value = s.goals.home;
    document.getElementById('goalKids').value = s.goals.kids;
    document.getElementById('goalSocial').value = s.goals.social;
    document.getElementById('goalSelfcare').value = s.goals.selfcare;
    document.getElementById('goalShopping').value = s.goals.shopping;
    document.getElementById('settingDailyReminder').checked = s.dailyReminder;
    document.getElementById('settingDeadlineAlert').checked = s.deadlineAlert;

    // Theme
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === s.theme));

    // Courses
    const courseDiv = document.getElementById('courseSettings');
    courseDiv.innerHTML = s.courses.map((c, i) => `
        <div class="course-field">
            <input type="text" value="${escapeHtml(c)}" data-course-index="${i}" placeholder="Ders adı">
            <button onclick="removeCourse(${i})">✕</button>
        </div>
    `).join('');
}

function addCourseField() {
    state.settings.courses.push('');
    save();
    renderSettings();
}

function removeCourse(index) {
    state.settings.courses.splice(index, 1);
    save();
    renderSettings();
}

function saveSettings() {
    const s = state.settings;
    s.name = document.getElementById('settingName').value;
    s.wakeUp = document.getElementById('settingWakeUp').value;
    s.sleep = document.getElementById('settingSleep').value;
    s.goals.school = parseFloat(document.getElementById('goalSchool').value) || 0;
    s.goals.home = parseFloat(document.getElementById('goalHome').value) || 0;
    s.goals.kids = parseFloat(document.getElementById('goalKids').value) || 0;
    s.goals.social = parseFloat(document.getElementById('goalSocial').value) || 0;
    s.goals.selfcare = parseFloat(document.getElementById('goalSelfcare').value) || 0;
    s.goals.shopping = parseFloat(document.getElementById('goalShopping').value) || 0;
    s.dailyReminder = document.getElementById('settingDailyReminder').checked;
    s.deadlineAlert = document.getElementById('settingDeadlineAlert').checked;

    // Courses
    const courseInputs = document.querySelectorAll('[data-course-index]');
    s.courses = Array.from(courseInputs).map(input => input.value);

    save();
    toast('Ayarlar kaydedildi!');
    renderDashboard();
}

function setTheme(theme) {
    state.settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme);
    if (theme === 'light') document.documentElement.removeAttribute('data-theme');
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    save();
}

// ========== EVENTS (Quick Add) ==========
function openQuickAdd() {
    state.editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Hızlı Ekle';
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventCategory').value = 'school';
    document.getElementById('eventType').value = 'event';
    document.getElementById('eventDate').value = formatDate(new Date());
    document.getElementById('eventDuration').value = '1';
    document.getElementById('eventStart').value = '';
    document.getElementById('eventEnd').value = '';
    document.getElementById('eventPriority').value = 'medium';
    document.getElementById('eventNote').value = '';
    document.getElementById('modalOverlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

function saveEvent() {
    const title = document.getElementById('eventTitle').value.trim();
    if (!title) { toast('Lütfen başlık girin'); return; }

    const data = {
        id: state.editingEventId || genId(),
        title,
        category: document.getElementById('eventCategory').value,
        type: document.getElementById('eventType').value,
        date: document.getElementById('eventDate').value,
        duration: parseFloat(document.getElementById('eventDuration').value) || 0,
        startTime: document.getElementById('eventStart').value,
        endTime: document.getElementById('eventEnd').value,
        priority: document.getElementById('eventPriority').value,
        note: document.getElementById('eventNote').value
    };

    if (data.type === 'task') {
        if (state.editingEventId) {
            const idx = state.tasks.findIndex(t => t.id === state.editingEventId);
            if (idx >= 0) state.tasks[idx] = { ...state.tasks[idx], ...data };
        } else {
            data.status = 'todo';
            state.tasks.push(data);
        }
    } else {
        if (state.editingEventId) {
            const idx = state.events.findIndex(e => e.id === state.editingEventId);
            if (idx >= 0) state.events[idx] = { ...state.events[idx], ...data };
        } else {
            state.events.push(data);
        }
    }

    save();
    closeModal();
    toast(state.editingEventId ? 'Güncellendi!' : 'Eklendi!');
    state.editingEventId = null;

    // Re-render current page
    const activePage = document.querySelector('.nav-item.active')?.dataset.page || 'dashboard';
    renderPage(activePage);
}

function editEvent(id) {
    let item = state.events.find(e => e.id === id);
    let type = 'event';
    if (!item) {
        item = state.tasks.find(t => t.id === id);
        type = 'task';
    }
    if (!item) return;

    state.editingEventId = id;
    document.getElementById('modalTitle').textContent = 'Düzenle';
    document.getElementById('eventTitle').value = item.title || '';
    document.getElementById('eventCategory').value = item.category || 'school';
    document.getElementById('eventType').value = type;
    document.getElementById('eventDate').value = item.date || '';
    document.getElementById('eventDuration').value = item.duration || 1;
    document.getElementById('eventStart').value = item.startTime || '';
    document.getElementById('eventEnd').value = item.endTime || '';
    document.getElementById('eventPriority').value = item.priority || 'medium';
    document.getElementById('eventNote').value = item.note || '';
    document.getElementById('modalOverlay').style.display = 'flex';
}

function deleteEvent(id) {
    if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    state.events = state.events.filter(e => e.id !== id);
    state.tasks = state.tasks.filter(t => t.id !== id);
    save();
    closeDayDetail();
    const activePage = document.querySelector('.nav-item.active')?.dataset.page || 'dashboard';
    renderPage(activePage);
    toast('Silindi');
}

// ========== DATA IMPORT/EXPORT ==========
function exportData() {
    const data = {
        events: state.events,
        tasks: state.tasks,
        journal: state.journal,
        settings: state.settings,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deniz-backup-${formatDate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Veriler dışa aktarıldı');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.events) state.events = data.events;
            if (data.tasks) state.tasks = data.tasks;
            if (data.journal) state.journal = data.journal;
            if (data.settings) state.settings = { ...state.settings, ...data.settings };
            save();
            toast('Veriler içe aktarıldı!');
            renderDashboard();
        } catch {
            toast('Dosya okunamadı');
        }
    };
    reader.readAsText(file);
}

// ========== HELPERS ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========== AUTO-CREATE JOURNAL ON TYPING ==========
function ensureJournalEntry() {
    if (!state.currentJournalId) {
        const entry = {
            id: genId(),
            title: '',
            content: '',
            date: formatDate(new Date()),
            mood: '',
            tags: []
        };
        state.journal.push(entry);
        state.currentJournalId = entry.id;
        document.getElementById('journalDate').textContent = formatDateTR(entry.date);
    }
}

document.getElementById('journalTitle')?.addEventListener('focus', ensureJournalEntry);
document.getElementById('journalContent')?.addEventListener('focus', ensureJournalEntry);

// ========== AUTO-CALCULATE DURATION ==========
document.getElementById('eventEnd')?.addEventListener('change', function() {
    const start = document.getElementById('eventStart').value;
    const end = this.value;
    if (start && end) {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        let dur = (eh * 60 + em - sh * 60 - sm) / 60;
        if (dur < 0) dur += 24;
        document.getElementById('eventDuration').value = dur.toFixed(2);
    }
});

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        closeDayDetail();
    }
    // Ctrl+N for quick add
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openQuickAdd();
    }
});

// Close modal on overlay click
document.getElementById('modalOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ========== INIT ==========
function init() {
    if (state.settings.theme && state.settings.theme !== 'light') {
        document.documentElement.setAttribute('data-theme', state.settings.theme);
    }
    seedMorningRoutine();
    renderDashboard();
}

init();
