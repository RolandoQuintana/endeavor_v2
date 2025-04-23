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
        const colors = GOOGLE_CALENDAR_COLORS; // Use the constant directly

        // Create custom select container
        const customSelect = document.createElement('div');
        customSelect.className = 'custom-select';

        // Create selected display
        const selectedDisplay = document.createElement('div');
        selectedDisplay.className = 'selected-color';
        selectedDisplay.innerHTML = `
            <div class="color-swatch"></div>
            <span>Select a color</span>
            <div class="dropdown-arrow">▼</div>
        `;

        // Create dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'color-dropdown';

        // Add color options
        dropdown.innerHTML = Object.entries(colors)
            .map(([id, {name, color}]) => `
                <div class="color-option" data-value="${id}" data-color="${color}">
                    <div class="color-swatch" style="background-color: ${color}"></div>
                    <span>${name}</span>
                </div>
            `).join('');

        // Assemble custom select
        customSelect.appendChild(selectedDisplay);
        customSelect.appendChild(dropdown);

        // Replace original select with custom select
        this.colorSelect.style.display = 'none';
        this.colorSelect.parentNode.insertBefore(customSelect, this.colorSelect);

        // Set initial value for the hidden select
        this.colorSelect.innerHTML = Object.entries(colors)
            .map(([id, {name}]) => `<option value="${id}">${name}</option>`)
            .join('');

        // Handle click events
        selectedDisplay.addEventListener('click', () => {
            customSelect.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                customSelect.classList.remove('open');
            }
        });

        // Handle option selection
        dropdown.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                const color = option.dataset.color;
                const name = option.querySelector('span').textContent;

                // Update display
                selectedDisplay.innerHTML = `
                    <div class="color-swatch" style="background-color: ${color}"></div>
                    <span>${name}</span>
                    <div class="dropdown-arrow">▼</div>
                `;

                // Update hidden select value
                this.colorSelect.value = value;

                // Close dropdown
                customSelect.classList.remove('open');
            });
        });
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

        // Log endeavors for debugging
        console.log('Rendering endeavors:', endeavors);

        this.endeavorList.innerHTML = endeavors.map(endeavor => {
            const currentColor = GOOGLE_CALENDAR_COLORS[endeavor.colorId];

            // Log color mapping for debugging
            console.log('Color mapping:', {
                endeavorId: endeavor.id,
                colorId: endeavor.colorId,
                mappedColor: currentColor
            });

            return `
                <div class="endeavor-item" style="background-color: ${currentColor?.color || '#000000'}">
                    <div class="endeavor-info">
                        <span class="endeavor-name">${endeavor.name}</span>
                        <select class="color-edit" data-id="${endeavor.id}">
                            ${Object.entries(GOOGLE_CALENDAR_COLORS).map(([id, {name, color}]) => `
                                <option value="${id}" ${id === endeavor.colorId ? 'selected' : ''}>
                                    ${name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <button class="delete-button" data-id="${endeavor.id}">Delete</button>
                </div>
            `;
        }).join('');

        // Add event listeners
        this.endeavorList.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => this.deleteEndeavor(button.dataset.id));
        });

        this.endeavorList.querySelectorAll('.color-edit').forEach(select => {
            select.addEventListener('change', (e) => this.updateEndeavorColor(e.target.dataset.id, e.target.value));
        });
    }

    getColorForId(colorId) {
        return GOOGLE_CALENDAR_COLORS[colorId]?.color || '#000000';
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

        // Log the values to debug
        console.log('Adding endeavor with:', {
            name,
            colorId,
            selectedColor: GOOGLE_CALENDAR_COLORS[colorId]
        });

        const newEndeavor = {
            id: Date.now().toString(),
            name,
            colorId,
            createdAt: Date.now()
        };

        const result = await chrome.storage.sync.get('endeavors');
        const endeavors = result.endeavors || [];
        endeavors.push(newEndeavor);

        await chrome.storage.sync.set({ endeavors });

        // Log the saved endeavor
        console.log('Saved endeavor:', newEndeavor);

        this.nameInput.value = '';
        await this.loadEndeavors();
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

    async updateEndeavorColor(id, newColorId) {
        console.log('Updating endeavor color:', id, newColorId);
        const result = await chrome.storage.sync.get('endeavors');
        const endeavors = result.endeavors || [];
        const endeavor = endeavors.find(e => e.id === id);

        if (endeavor) {
            endeavor.colorId = newColorId;
            await chrome.storage.sync.set({ endeavors });
            this.renderEndeavors(endeavors);
        }
    }
}

// Initialize the options page
new OptionsPage();