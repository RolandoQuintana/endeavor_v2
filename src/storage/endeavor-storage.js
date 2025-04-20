const EndeavorStorage = {
  STORAGE_KEY: 'endeavors',

  async getAllEndeavors() {
    const result = await chrome.storage.sync.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || [];
  },

  async saveEndeavor(endeavor) {
    const endeavors = await this.getAllEndeavors();
    const existingIndex = endeavors.findIndex(e => e.id === endeavor.id);

    if (existingIndex >= 0) {
      endeavors[existingIndex] = endeavor;
    } else {
      endeavors.push(endeavor);
    }

    await chrome.storage.sync.set({ [this.STORAGE_KEY]: endeavors });
  },

  async deleteEndeavor(id) {
    const endeavors = await this.getAllEndeavors();
    const filteredEndeavors = endeavors.filter(e => e.id !== id);
    await chrome.storage.sync.set({ [this.STORAGE_KEY]: filteredEndeavors });
  }
};

export { EndeavorStorage };