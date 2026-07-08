import './style.css';

const STORAGE_KEY = 'digital_time_capsules';
const THEME_KEY = 'digital_time_capsule_theme';

let capsules = [];
let currentFilter = 'all';
let searchQuery = '';
let editingCapsuleId = null;
let tempImages = [];
let countdownIntervals = {};

const elements = {
    capsuleForm: null,
    modalOverlay: null,
    capsulesContainer: null,
    emptyState: null,
    searchInput: null,
    totalCapsules: null,
    lockedCapsules: null,
    unlockedCapsules: null,
    publicCapsules: null,
    privateCapsules: null,
    imageInput: null,
    imageUploadArea: null,
    imagePreviews: null,
    toastContainer: null,
    viewModalOverlay: null,
    viewModalBody: null,
    viewModalTitle: null,
    modalTitle: null,
    submitBtn: null,
    importInput: null
};

function initializeElements() {
    elements.modalOverlay = document.getElementById('modalOverlay');
    elements.capsuleModal = document.getElementById('capsuleModal');
    elements.modalTitle = document.getElementById('modalTitle');
    elements.capsuleForm = document.getElementById('capsuleForm');
    elements.capsulesContainer = document.getElementById('capsulesContainer');
    elements.emptyState = document.getElementById('emptyState');
    elements.searchInput = document.getElementById('searchInput');
    elements.totalCapsules = document.getElementById('totalCapsules');
    elements.lockedCapsules = document.getElementById('lockedCapsules');
    elements.unlockedCapsules = document.getElementById('unlockedCapsules');
    elements.publicCapsules = document.getElementById('publicCapsules');
    elements.privateCapsules = document.getElementById('privateCapsules');
    elements.imageInput = document.getElementById('imageInput');
    elements.imageUploadArea = document.getElementById('imageUploadArea');
    elements.imagePreviews = document.getElementById('imagePreviews');
    elements.toastContainer = document.getElementById('toastContainer');
    elements.viewModalOverlay = document.getElementById('viewModalOverlay');
    elements.viewModalBody = document.getElementById('viewModalBody');
    elements.viewModalTitle = document.getElementById('viewModalTitle');
    elements.submitBtn = document.getElementById('submitBtn');
    elements.importInput = document.getElementById('importInput');
}

function generateId() {
    return `capsule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function loadCapsules() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        capsules = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading capsules:', error);
        capsules = [];
    }
}

function saveCapsules() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(capsules));
    } catch (error) {
        console.error('Error saving capsules:', error);
        showToast('Failed to save capsule. Storage may be full.', 'error');
    }
}

function loadTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else if (stored === 'light') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(THEME_KEY, 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(THEME_KEY, 'dark');
    }
}

function isCapsuleUnlocked(capsule) {
    return new Date() >= new Date(capsule.unlockDateTime);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCountdownParts(unlockDateTime) {
    const now = new Date();
    const unlock = new Date(unlockDateTime);
    const diff = unlock - now;

    if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
}

function formatCountdown(unlockDateTime) {
    const parts = getCountdownParts(unlockDateTime);
    return `${parts.days}d ${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
}

function getStats() {
    return {
        total: capsules.length,
        locked: capsules.filter(c => !isCapsuleUnlocked(c)).length,
        unlocked: capsules.filter(c => isCapsuleUnlocked(c)).length,
        public: capsules.filter(c => c.visibility === 'public').length,
        private: capsules.filter(c => c.visibility === 'private').length
    };
}

function updateStatsAnimated() {
    const stats = getStats();

    animateNumber(elements.totalCapsules, stats.total);
    animateNumber(elements.lockedCapsules, stats.locked);
    animateNumber(elements.unlockedCapsules, stats.unlocked);
    animateNumber(elements.publicCapsules, stats.public);
    animateNumber(elements.privateCapsules, stats.private);
}

function animateNumber(element, target) {
    const current = parseInt(element.textContent) || 0;
    const diff = target - current;
    const duration = 500;
    const start = performance.now();

    function update(timestamp) {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.round(current + diff * progress);
        element.textContent = value;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function filterCapsules() {
    let filtered = [...capsules];

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(c =>
            c.title.toLowerCase().includes(query) ||
            (c.message && c.message.toLowerCase().includes(query)) ||
            (c.notes && c.notes.toLowerCase().includes(query))
        );
    }

    switch (currentFilter) {
        case 'locked':
            filtered = filtered.filter(c => !isCapsuleUnlocked(c));
            break;
        case 'unlocked':
            filtered = filtered.filter(c => isCapsuleUnlocked(c));
            break;
        case 'public':
            filtered = filtered.filter(c => c.visibility === 'public');
            break;
        case 'private':
            filtered = filtered.filter(c => c.visibility === 'private');
            break;
    }

    return filtered;
}

function clearAllCountdowns() {
    Object.values(countdownIntervals).forEach(interval => clearInterval(interval));
    countdownIntervals = {};
}

function renderCapsules() {
    clearAllCountdowns();

    const filtered = filterCapsules();
    const existingCards = elements.capsulesContainer.querySelectorAll('.capsule-card');

    existingCards.forEach(card => card.remove());

    if (filtered.length === 0) {
        elements.emptyState.classList.remove('hidden');
        elements.emptyState.style.display = '';
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.emptyState.style.display = 'none';

    filtered.forEach(capsule => {
        const card = createCapsuleCard(capsule);
        elements.capsulesContainer.appendChild(card);
    });
}

function createCapsuleCard(capsule) {
    const unlocked = isCapsuleUnlocked(capsule);
    const hasImages = capsule.images && capsule.images.length > 0;

    const card = document.createElement('div');
    card.className = 'capsule-card';
    card.dataset.id = capsule.id;

    card.innerHTML = `
        ${hasImages ? `<img src="${unlocked ? capsule.images[0] : generatePlaceholder()}" alt="${capsule.title}" class="capsule-card-image">` : `<div class="capsule-card-image" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, var(--gradient-start), var(--gradient-mid));">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" opacity="0.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
            </svg>
        </div>`}
        <div class="capsule-card-body">
            <div class="capsule-card-header">
                <h3 class="capsule-title">${escapeHtml(capsule.title)}</h3>
                <div class="capsule-badges">
                    <span class="badge ${unlocked ? 'badge-unlocked' : 'badge-locked'}">${unlocked ? 'Unlocked' : 'Locked'}</span>
                    <span class="badge badge-${capsule.visibility}">${capsule.visibility}</span>
                </div>
            </div>
            <div class="capsule-dates">
                <div class="capsule-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Created: ${formatDate(capsule.createdAt)}
                </div>
                <div class="capsule-date">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Unlocks: ${formatDate(capsule.unlockDateTime)}
                </div>
            </div>
            ${unlocked ? createUnlockedContent(capsule) : createLockedContent(capsule)}
            <div class="capsule-actions">
                <button class="btn btn-secondary view-btn" data-id="${capsule.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View
                </button>
                <button class="btn-icon edit-btn" data-id="${capsule.id}" title="Edit Capsule">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-icon delete delete-btn" data-id="${capsule.id}" title="Delete Capsule">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    if (!unlocked) {
        setTimeout(() => startCountdown(capsule), 0);
    }

    return card;
}

function createUnlockedContent(capsule) {
    let content = '';
    if (capsule.message) {
        content += `<p class="capsule-message">${escapeHtml(capsule.message)}</p>`;
    }
    if (capsule.notes) {
        content += `<p class="capsule-notes">Note: ${escapeHtml(capsule.notes)}</p>`;
    }
    return content;
}

function createLockedContent(capsule) {
    return `
        <div class="locked-message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            This capsule is locked until ${formatDate(capsule.unlockDateTime)}
        </div>
        <div class="countdown-container">
            <div class="countdown-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                Unlocks in
            </div>
            <div class="countdown-timer" id="countdown-${capsule.id}">
                ${createCountdownHTML(capsule.unlockDateTime)}
            </div>
        </div>
    `;
}

function createCountdownHTML(unlockDateTime) {
    const parts = getCountdownParts(unlockDateTime);
    return `
        <div class="countdown-item">
            <span class="countdown-value">${parts.days}</span>
            <span class="countdown-unit">Days</span>
        </div>
        <div class="countdown-item">
            <span class="countdown-value">${parts.hours}</span>
            <span class="countdown-unit">Hours</span>
        </div>
        <div class="countdown-item">
            <span class="countdown-value">${parts.minutes}</span>
            <span class="countdown-unit">Min</span>
        </div>
        <div class="countdown-item">
            <span class="countdown-value">${parts.seconds}</span>
            <span class="countdown-unit">Sec</span>
        </div>
    `;
}

function startCountdown(capsule) {
    const countdownEl = document.getElementById(`countdown-${capsule.id}`);
    if (!countdownEl) return;

    if (countdownIntervals[capsule.id]) {
        clearInterval(countdownIntervals[capsule.id]);
    }

    countdownIntervals[capsule.id] = setInterval(() => {
        if (isCapsuleUnlocked(capsule)) {
            clearInterval(countdownIntervals[capsule.id]);
            delete countdownIntervals[capsule.id];
            handleCapsuleUnlock(capsule.id);
        } else {
            countdownEl.innerHTML = createCountdownHTML(capsule.unlockDateTime);
        }
    }, 1000);
}

function handleCapsuleUnlock(capsuleId) {
    const card = document.querySelector(`.capsule-card[data-id="${capsuleId}"]`);
    if (card) {
        card.classList.add('unlocked-celebration');
        setTimeout(() => renderCapsules(), 800);
        showToast('A capsule has been unlocked!', 'success');
        updateStatsAnimated();
    }
}

function generatePlaceholder() {
    return 'data:image/svg+xml,' + encodeURIComponent(`
        <svg width="320" height="180" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="320" height="180" fill="#e5e7eb"/>
            <circle cx="160" cy="90" r="20" stroke="#9ca3af" stroke-width="2"/>
            <path d="M160 70v20l10 10" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
        </svg>
    `);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openModal(isEdit = false, capsule = null) {
    editingCapsuleId = capsule ? capsule.id : null;
    elements.modalTitle.textContent = isEdit ? 'Edit Capsule' : 'Create New Capsule';
    elements.submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Capsule';

    if (isEdit && capsule) {
        document.getElementById('title').value = capsule.title;
        document.getElementById('message').value = capsule.message || '';
        document.getElementById('notes').value = capsule.notes || '';
        document.getElementById('unlockDateTime').value = capsule.unlockDateTime;
        document.querySelector(`input[name="visibility"][value="${capsule.visibility}"]`).checked = true;
        tempImages = capsule.images || [];
        renderImagePreviews();
    } else {
        elements.capsuleForm.reset();
        tempImages = [];
        renderImagePreviews();
        setMinDateTime();
    }

    elements.modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    elements.modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    editingCapsuleId = null;
    tempImages = [];
    clearFormErrors();
}

function setMinDateTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const input = document.getElementById('unlockDateTime');
    input.min = now.toISOString().slice(0, 16);
}

function clearFormErrors() {
    document.getElementById('titleError').textContent = '';
    document.getElementById('dateError').textContent = '';
}

function validateForm() {
    clearFormErrors();
    let isValid = true;

    const title = document.getElementById('title').value.trim();
    if (!title) {
        document.getElementById('titleError').textContent = 'Title is required';
        isValid = false;
    }

    const unlockDateTime = document.getElementById('unlockDateTime').value;
    if (!unlockDateTime) {
        document.getElementById('dateError').textContent = 'Unlock date is required';
        isValid = false;
    } else if (new Date(unlockDateTime) <= new Date()) {
        document.getElementById('dateError').textContent = 'Unlock date must be in the future';
        isValid = false;
    }

    return isValid;
}

function handleFormSubmit(event) {
    event.preventDefault();

    if (!validateForm()) return;

    const capsuleData = {
        id: editingCapsuleId || generateId(),
        title: document.getElementById('title').value.trim(),
        message: document.getElementById('message').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        unlockDateTime: document.getElementById('unlockDateTime').value,
        visibility: document.querySelector('input[name="visibility"]:checked').value,
        images: tempImages,
        createdAt: editingCapsuleId ?
            capsules.find(c => c.id === editingCapsuleId)?.createdAt || new Date().toISOString() :
            new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingCapsuleId) {
        const index = capsules.findIndex(c => c.id === editingCapsuleId);
        if (index !== -1) {
            capsules[index] = capsuleData;
            showToast('Capsule updated successfully', 'success');
        }
    } else {
        capsules.push(capsuleData);
        showToast('Capsule created successfully', 'success');
    }

    saveCapsules();
    updateStatsAnimated();
    renderCapsules();
    closeModal();
}

function handleImageUpload(files) {
    const maxSize = 5 * 1024 * 1024;

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) {
            showToast('Only image files are allowed', 'error');
            return;
        }

        if (file.size > maxSize) {
            showToast('Image size must be under 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            tempImages.push(e.target.result);
            renderImagePreviews();
        };
        reader.onerror = () => {
            showToast('Failed to read image file', 'error');
        };
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    elements.imagePreviews.innerHTML = '';

    tempImages.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
            <img src="${image}" alt="Preview ${index + 1}">
            <button type="button" class="image-preview-remove" data-index="${index}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        elements.imagePreviews.appendChild(item);
    });

    document.querySelectorAll('.image-preview-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            tempImages.splice(index, 1);
            renderImagePreviews();
        });
    });
}

function openViewModal(capsule) {
    const unlocked = isCapsuleUnlocked(capsule);

    elements.viewModalTitle.textContent = capsule.title;

    let imagesHTML = '';
    if (unlocked && capsule.images && capsule.images.length > 0) {
        imagesHTML = `
            <div class="view-modal-images">
                ${capsule.images.map(img => `<img src="${img}" alt="Capsule image" class="view-modal-image">`).join('')}
            </div>
        `;
    }

    let messageHTML = '';
    if (unlocked && capsule.message) {
        messageHTML += `
            <div class="view-modal-content">
                <h3>Message</h3>
                <p>${escapeHtml(capsule.message)}</p>
            </div>
        `;
    }

    if (unlocked && capsule.notes) {
        messageHTML += `
            <div class="view-modal-content">
                <h3>Notes</h3>
                <p>${escapeHtml(capsule.notes)}</p>
            </div>
        `;
    }

    if (!unlocked) {
        messageHTML = `
            <div class="locked-message">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>This capsule is locked until ${formatDate(capsule.unlockDateTime)}</span>
            </div>
        `;
    }

    elements.viewModalBody.innerHTML = `
        ${imagesHTML}
        ${messageHTML}
        <div class="view-modal-meta">
            <div class="view-modal-meta-item">
                <span class="view-modal-meta-label">Created</span>
                <span class="view-modal-meta-value">${formatDate(capsule.createdAt)}</span>
            </div>
            <div class="view-modal-meta-item">
                <span class="view-modal-meta-label">Unlock Date</span>
                <span class="view-modal-meta-value">${formatDate(capsule.unlockDateTime)}</span>
            </div>
            <div class="view-modal-meta-item">
                <span class="view-modal-meta-label">Visibility</span>
                <span class="view-modal-meta-value">${capsule.visibility}</span>
            </div>
            <div class="view-modal-meta-item">
                <span class="view-modal-meta-label">Status</span>
                <span class="view-modal-meta-value">${unlocked ? 'Unlocked' : 'Locked'}</span>
            </div>
        </div>
    `;

    elements.viewModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeViewModal() {
    elements.viewModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function deleteCapsule(capsuleId) {
    const capsule = capsules.find(c => c.id === capsuleId);
    if (!capsule) return;

    if (confirm(`Are you sure you want to delete "${capsule.title}"? This action cannot be undone.`)) {
        const card = document.querySelector(`.capsule-card[data-id="${capsuleId}"]`);
        if (card) {
            card.classList.add('removing');
            setTimeout(() => {
                capsules = capsules.filter(c => c.id !== capsuleId);
                saveCapsules();
                updateStatsAnimated();
                renderCapsules();
                showToast('Capsule deleted successfully', 'success');
            }, 250);
        }
    }
}

function exportCapsules() {
    if (capsules.length === 0) {
        showToast('No capsules to export', 'info');
        return;
    }

    const data = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        capsules: capsules
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `time-capsules-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('Capsules exported successfully', 'success');
}

function importCapsules(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.capsules || !Array.isArray(data.capsules)) {
                throw new Error('Invalid file format');
            }

            let importedCount = 0;
            data.capsules.forEach(capsule => {
                if (capsule.title && capsule.unlockDateTime) {
                    capsule.id = generateId();
                    capsules.push(capsule);
                    importedCount++;
                }
            });

            saveCapsules();
            updateStatsAnimated();
            renderCapsules();
            showToast(`Imported ${importedCount} capsule(s) successfully`, 'success');
        } catch (error) {
            showToast('Failed to import capsules. Invalid file format.', 'error');
        }
    };

    reader.onerror = () => {
        showToast('Failed to read file', 'error');
    };

    reader.readAsText(file);
}

function clearAllCapsules() {
    if (capsules.length === 0) {
        showToast('No capsules to clear', 'info');
        return;
    }

    if (confirm('Are you sure you want to delete ALL capsules? This action cannot be undone.')) {
        capsules = [];
        clearAllCountdowns();
        saveCapsules();
        updateStatsAnimated();
        renderCapsules();
        showToast('All capsules have been deleted', 'success');
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';

    const iconSVGs = {
        success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    toast.innerHTML = `
        <div class="toast-icon ${type}">
            ${iconSVGs[type]}
        </div>
        <span class="toast-message">${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 250);
    }, 3000);
}

function setupEventListeners() {
    document.getElementById('createCapsuleBtn').addEventListener('click', () => openModal());
    document.getElementById('emptyStateBtn').addEventListener('click', () => openModal());
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    elements.capsuleForm.addEventListener('submit', handleFormSubmit);

    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCapsules();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderCapsules();
        });
    });

    elements.capsulesContainer.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-btn');
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (viewBtn) {
            const capsule = capsules.find(c => c.id === viewBtn.dataset.id);
            if (capsule) openViewModal(capsule);
        }

        if (editBtn) {
            const capsule = capsules.find(c => c.id === editBtn.dataset.id);
            if (capsule) openModal(true, capsule);
        }

        if (deleteBtn) {
            deleteCapsule(deleteBtn.dataset.id);
        }
    });

    elements.imageUploadArea.addEventListener('click', () => {
        elements.imageInput.click();
    });

    elements.imageInput.addEventListener('change', (e) => {
        handleImageUpload(e.target.files);
        e.target.value = '';
    });

    elements.imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.imageUploadArea.classList.add('dragover');
    });

    elements.imageUploadArea.addEventListener('dragleave', () => {
        elements.imageUploadArea.classList.remove('dragover');
    });

    elements.imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.imageUploadArea.classList.remove('dragover');
        handleImageUpload(e.dataTransfer.files);
    });

    document.getElementById('viewModalClose').addEventListener('click', closeViewModal);
    elements.viewModalOverlay.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeViewModal();
    });

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    document.getElementById('exportBtn').addEventListener('click', exportCapsules);

    document.getElementById('importBtn').addEventListener('click', () => {
        elements.importInput.click();
    });

    elements.importInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importCapsules(e.target.files[0]);
            e.target.value = '';
        }
    });

    document.getElementById('clearAllBtn').addEventListener('click', clearAllCapsules);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.modalOverlay.classList.contains('active')) {
                closeModal();
            }
            if (elements.viewModalOverlay.classList.contains('active')) {
                closeViewModal();
            }
        }
    });

    setInterval(() => {
        capsules.forEach(capsule => {
            if (!isCapsuleUnlocked(capsule)) {
                const card = document.querySelector(`.capsule-card[data-id="${capsule.id}"]`);
                if (card && isCapsuleUnlocked({
                    ...capsule,
                    unlockDateTime: capsule.unlockDateTime
                })) {
                    handleCapsuleUnlock(capsule.id);
                }
            }
        });
    }, 1000);
}

function init() {
    initializeElements();
    loadTheme();
    loadCapsules();
    updateStatsAnimated();
    renderCapsules();
    setupEventListeners();
}

document.addEventListener('DOMContentLoaded', init);
