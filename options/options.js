const GOOGLE_CALENDAR_COLORS = {
    '1': { color: '#7986cb', name: 'Lavender' },
    '2': { color: '#33b679', name: 'Sage' },
    '3': { color: '#8e24aa', name: 'Grape' },
    '4': { color: '#e67c73', name: 'Flamingo' },
    '5': { color: '#f6bf26', name: 'Banana' },
    '6': { color: '#f4511e', name: 'Tangerine' },
    '7': { color: '#039be5', name: 'Peacock' },
    '8': { color: '#616161', name: 'Graphite' },
    '9': { color: '#3f51b5', name: 'Blueberry' },
    '10': { color: '#0b8043', name: 'Basil' },
    '11': { color: '#d50000', name: 'Tomato' }
};

class OptionsPage {
    constructor() {
        console.log('Options page initialized');
        this.endeavorList = document.getElementById('endeavorList');
        this.nameInput = document.getElementById('newEndeavorName');
        this.colorSelect = document.getElementById('colorSelect');
        this.addButton = document.getElementById('addEndeavor');

        this.initialize();
    }

    async initialize() {
        this.loadColorOptions();
        await this.loadEndeavors();
        this.setupEventListeners();
    }

    loadColorOptions() {
        const colors = {
            '1': { color: '#7986cb', name: 'Lavender' },
            '2': { color: '#33b679', name: 'Sage' },
            '3': { color: '#8e24aa', name: 'Grape' },
            '4': { color: '#e67c73', name: 'Flamingo' },
            '5': { color: '#f6bf26', name: 'Banana' },
            '6': { color: '#f4511e', name: 'Tangerine' },
            '7': { color: '#039be5', name: 'Peacock' },
            '8': { color: '#616161', name: 'Graphite' },
            '9': { color: '#3f51b5', name: 'Blueberry' },
            '10': { color: '#0b8043', name: 'Basil' },
            '11': { color: '#d50000', name: 'Tomato' }
        };

        this.colorSelect.innerHTML = Object.entries(colors)
            .map(([id, {name, color}]) =>
                `<option value="${id}" style="background-color: ${color}">${name}</option>`
            ).join('');
    }

    async loadEndeavors() {
        console.log('Loading endeavors...');
        const result = await chrome.storage.sync.get('endeavors');
        const endeavors = result.endeavors || [];
        console.log('Current endeavors:', endeavors);
        this.renderEndeavors(endeavors);
    }

    renderEndeavors(endeavors) {
        if (!this.endeavorList) {
            console.error('Endeavor list element not found!');
            return;
        }

        if (endeavors.length === 0) {
            this.endeavorList.innerHTML = '<div class="no-endeavors">No endeavors yet. Create one above!</div>';
            return;
        }

        this.endeavorList.innerHTML = endeavors.map(endeavor => `
            <div class="endeavor-item" style="background-color: ${this.getColorForId(endeavor.colorId)}">
                <span>${endeavor.name}</span>
                <button class="delete-button" data-id="${endeavor.id}">Delete</button>
            </div>
        `).join('');

        // Add delete event listeners
        this.endeavorList.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => this.deleteEndeavor(button.dataset.id));
        });
    }

    getColorForId(colorId) {
        const colors = {
            '1': '#7986cb',
            '2': '#33b679',
            '3': '#8e24aa',
            '4': '#e67c73',
            '5': '#f6bf26',
            '6': '#f4511e',
            '7': '#039be5',
            '8': '#616161',
            '9': '#3f51b5',
            '10': '#0b8043',
            '11': '#d50000'
        };
        return colors[colorId] || '#000000';
    }

    setupEventListeners() {
        this.addButton.addEventListener('click', () => this.addEndeavor());
        this.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addEndeavor();
        });
    }

    async addEndeavor() {
        const name = this.nameInput.value.trim();
        const colorId = this.colorSelect.value;

        if (!name) return;

        const newEndeavor = {
            id: Date.now().toString(),
            name,
            colorId,
            createdAt: Date.now()
        };

        console.log('Adding new endeavor:', newEndeavor);

        const result = await chrome.storage.sync.get('endeavors');
        const endeavors = result.endeavors || [];
        endeavors.push(newEndeavor);

        await chrome.storage.sync.set({ endeavors });
        console.log('Endeavors updated:', endeavors);

        this.nameInput.value = '';
        this.loadEndeavors();
    }

    async deleteEndeavor(id) {
        console.log('Deleting endeavor:', id);
        const result = await chrome.storage.sync.get('endeavors');
        const endeavors = result.endeavors || [];
        const filteredEndeavors = endeavors.filter(e => e.id !== id);
        await chrome.storage.sync.set({ endeavors: filteredEndeavors });
        console.log('Endeavors after deletion:', filteredEndeavors);
        this.loadEndeavors();
    }
}

// Initialize the options page
new OptionsPage();