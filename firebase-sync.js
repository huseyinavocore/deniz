// ============================================
// DENIZ - Firebase Sync
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAglLz9JRbsk-v0HDt0OVbNSB-MKhmij74",
    authDomain: "deniz-f0175.firebaseapp.com",
    projectId: "deniz-f0175",
    storageBucket: "deniz-f0175.firebasestorage.app",
    messagingSenderId: "1073107924114",
    appId: "1:1073107924114:web:dcae0acb763a6993ffe24b"
};

// ========== INIT ==========
let db = null;
let auth = null;
let currentUser = null;
let isOnline = false;

function firebaseReady() {
    return firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0;
}

if (firebaseReady()) {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
}

// ========== AUTH ==========
function loginWithGoogle() {
    if (!firebaseReady()) {
        toast('Firebase henüz ayarlanmamış');
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => {
        toast('Giriş başarısız: ' + err.message);
    });
}

function logoutUser() {
    if (auth) auth.signOut();
    currentUser = null;
    isOnline = false;
    updateSyncUI();
    document.getElementById('loginScreen').classList.remove('hidden');
}

function useOffline() {
    document.getElementById('loginScreen').classList.add('hidden');
    updateSyncUI();
}

// ========== AUTH STATE ==========
if (firebaseReady()) {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            isOnline = true;
            document.getElementById('loginScreen').classList.add('hidden');
            updateSyncUI();
            loadFromCloud().then(() => {
                renderDashboard();
            });
        } else {
            currentUser = null;
            isOnline = false;
            updateSyncUI();
            // Giriş yapılmamış, login ekranını göster
            document.getElementById('loginScreen').classList.remove('hidden');
        }
    });
} else {
    document.getElementById('loginScreen').classList.add('hidden');
}

function updateSyncUI() {
    const dot = document.getElementById('syncDot');
    const text = document.getElementById('syncText');
    const info = document.getElementById('userInfo');
    const logout = document.getElementById('logoutBtn');

    if (isOnline && currentUser) {
        dot.className = 'sync-dot';
        text.textContent = 'Senkronize';
        info.style.display = 'flex';
        logout.style.display = 'block';
        document.getElementById('userAvatar').src = currentUser.photoURL || '';
        document.getElementById('userName').textContent = currentUser.displayName || currentUser.email;
    } else {
        dot.className = 'sync-dot offline';
        text.textContent = 'Çevrimdışı';
        info.style.display = 'none';
        logout.style.display = 'none';
    }
}

// ========== CLOUD SYNC ==========
function userDoc() {
    if (!db || !currentUser) return null;
    return db.collection('users').doc(currentUser.uid);
}

async function saveToCloud() {
    const doc = userDoc();
    if (!doc) return;

    const dot = document.getElementById('syncDot');
    dot.className = 'sync-dot syncing';

    try {
        await doc.set({
            events: JSON.parse(JSON.stringify(state.events)),
            tasks: JSON.parse(JSON.stringify(state.tasks)),
            journal: JSON.parse(JSON.stringify(state.journal)),
            settings: JSON.parse(JSON.stringify(state.settings)),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        dot.className = 'sync-dot';
        document.getElementById('syncText').textContent = 'Senkronize';
    } catch (err) {
        dot.className = 'sync-dot offline';
        document.getElementById('syncText').textContent = 'Hata!';
        console.error('Sync error:', err);
    }
}

async function loadFromCloud() {
    const doc = userDoc();
    if (!doc) return;

    try {
        const snap = await doc.get();
        if (snap.exists) {
            const data = snap.data();
            if (data.events) state.events = data.events;
            if (data.tasks) state.tasks = data.tasks;
            if (data.journal) state.journal = data.journal;
            if (data.settings) state.settings = { ...state.settings, ...data.settings };
            // localStorage'a da yaz (offline cache)
            DB.set('events', state.events);
            DB.set('tasks', state.tasks);
            DB.set('journal', state.journal);
            DB.set('settings', state.settings);
            // Sayfayı güncelle
            if (typeof renderDashboard === 'function') renderDashboard();
        } else {
            // İlk giriş: localStorage verisini cloud'a yükle
            await saveToCloud();
        }
    } catch (err) {
        console.error('Load error:', err);
    }
}

// ========== OVERRIDE SAVE ==========
// app.js zaten yüklendi, save() fonksiyonunu override et
const _originalSave = save;
save = function() {
    _originalSave();
    if (isOnline) saveToCloud();
};
