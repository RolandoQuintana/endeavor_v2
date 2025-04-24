console.log('Endeavor: Script loaded');

const GOOGLE_CALENDAR_COLORS = {
  '1': '#7986cb', // Lavender
  '2': '#33b679', // Sage
  '3': '#8e24aa', // Grape
  '4': '#e67c73', // Flamingo
  '5': '#f6bf26', // Banana
  '6': '#f4511e', // Tangerine
  '7': '#039be5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000'  // Tomato
};

class CalendarIntegration {
  constructor() {
    console.log('Endeavor: Calendar Integration initialized');
    this.observer = null;
    this.endeavors = [];  // Initialize empty array

    // Load endeavors first, then initialize everything else
    this.loadEndeavors().then(() => {
      this.logEndeavorState(); // Add logging to check endeavors
      this.initializeObserver();
      this.initializeTaskListObserver();

      // Initialize task coloring with a delay to ensure calendar is loaded
      setTimeout(() => this.initializeTaskColoring(), 2000);
    });

    chrome.runtime.onConnect.addListener(() => {
      console.log('Endeavor: Extension context reconnected');
      this.initializeObserver();
    });
  }

  async loadEndeavors() {
    try {
      const result = await chrome.storage.sync.get('endeavors');
      this.endeavors = result.endeavors || [];
      console.log('Endeavor: Loaded endeavors:', this.endeavors);
    } catch (error) {
      console.error('Endeavor: Error loading endeavors:', error);
      this.endeavors = [];
    }
  }

  initializeObserver() {
    console.log('Endeavor: Setting up mutation observer');

    if (this.observer) {
      this.observer.disconnect();
    }

    try {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Look for the unified dialog
              const dialog = node.matches('[role="dialog"]') ?
                node : node.querySelector('[role="dialog"]');

              if (dialog && !dialog.hasAttribute('data-endeavor-processed')) {
                dialog.setAttribute('data-endeavor-processed', 'true');

                // Handle the unified dialog
                this.handleUnifiedDialog(dialog).catch(error => {
                  console.log('Endeavor: Error handling unified dialog:', error);
                });
              }
            }
          });
        });
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (error) {
      console.log('Endeavor: Error initializing observer:', error);
    }
  }

  async handleUnifiedDialog(dialog) {
    try {
      console.log('Endeavor: Handling unified dialog', dialog);

      // Find the tab container
      const tabContainer = dialog.querySelector('[role="tablist"]');
      console.log('Endeavor: Found tab container?', !!tabContainer);

      // Find the content container where we'll inject our selector
      const contentContainer = dialog.querySelector('.mvRfff');
      console.log('Endeavor: Found content container?', !!contentContainer);

      if (!contentContainer) {
        // Try alternative selectors
        const altContainer = dialog.querySelector('[jscontroller="jfLi9e"]') ||
                            dialog.querySelector('[jsname="YuQhCf"]');
        console.log('Endeavor: Found alternative container?', !!altContainer);

        if (altContainer) {
          // Wait a bit for the dialog content to fully load
          await new Promise(resolve => setTimeout(resolve, 100));
          await this.injectEndeavorSelector(altContainer);
        }
      } else {
        await this.injectEndeavorSelector(contentContainer);
      }

    } catch (error) {
      console.log('Endeavor: Error handling unified dialog:', error);
    }
  }

  async injectEndeavorSelector(targetElement) {
    try {
      console.log('Endeavor: Attempting to inject selector into', targetElement);

      if (targetElement.querySelector('.endeavor-selector')) {
        console.log('Endeavor: Selector already exists, skipping');
        return;
      }

      const result = await chrome.storage.sync.get('endeavors');
      const endeavors = result.endeavors || [];

      // Create wrapper with Google Calendar's styling
      const wrapper = document.createElement('div');
      wrapper.className = 'Fgl6fe-fmcmS-yrriRe-OWXEXe-H9tDt endeavor-selector';
      wrapper.style.marginTop = '8px';

      // Create inner container
      const container = document.createElement('div');
      container.className = 'Fgl6fe-fmcmS-yrriRe';

      // Create label container
      const labelContainer = document.createElement('div');
      labelContainer.className = 'Fgl6fe-fmcmS-yrriRe-L6cTce';

      // Create label
      const label = document.createElement('div');
      label.className = 'Fgl6fe-fmcmS-yrriRe-JNdkSc';
      label.textContent = 'Endeavor';

      // Create select container
      const selectContainer = document.createElement('div');
      selectContainer.className = 'Fgl6fe-fmcmS-wGMbrd-sM5MNb';

      // Create select
      const select = document.createElement('select');
      select.className = 'Fgl6fe-fmcmS-wGMbrd';
      select.style.width = '100%';

      select.innerHTML = `
        <option value="">Select an endeavor</option>
        ${endeavors.map(endeavor => `
          <option value="${endeavor.id}" data-color-id="${endeavor.colorId}">
            ${endeavor.name}
          </option>
        `).join('')}
      `;

      // Assemble the elements
      labelContainer.appendChild(label);
      selectContainer.appendChild(select);
      container.appendChild(labelContainer);
      container.appendChild(selectContainer);
      wrapper.appendChild(container);

      // Find the best injection point
      const titleSection = targetElement.querySelector('[jsname="s3pQNb"]') || // Event title section
                          targetElement.querySelector('[jsname="dQYJN"]');     // Task title section

      if (titleSection) {
        console.log('Endeavor: Found title section, injecting after');
        titleSection.parentNode.insertBefore(wrapper, titleSection.nextSibling);
      } else {
        // Fallback: try to find a good insertion point
        const firstSection = targetElement.firstElementChild;
        if (firstSection) {
          console.log('Endeavor: Using first section as reference point');
          firstSection.parentNode.insertBefore(wrapper, firstSection.nextSibling);
        } else {
          console.log('Endeavor: Falling back to appending to target element');
          targetElement.appendChild(wrapper);
        }
      }

      // Add change handler
      select.addEventListener('change', async (e) => {
        try {
          const selectedOption = e.target.options[e.target.selectedIndex];
          const colorId = selectedOption.getAttribute('data-color-id');
          const endeavorId = selectedOption.value;

          // Keep existing task detection logic
          const dialog = targetElement.closest('[role="dialog"]');
          const isTaskMethod1 = dialog?.querySelector('[role="tab"][aria-label*="Task"][aria-selected="true"]');
          const isTaskMethod2 = dialog?.querySelector('[data-tab-id="task"]');
          const isTaskMethod3 = Array.from(dialog?.querySelectorAll('[role="tab"]') || [])
            .some(tab => tab.textContent?.includes('Task') && tab.getAttribute('aria-selected') === 'true');
          const isTaskMethod4 = dialog?.querySelector('.VfPpkd-O1htCb-OWXEXe-INsAgc')?.textContent?.includes('Task');

          const isTask = isTaskMethod1 || isTaskMethod2 || isTaskMethod3 || isTaskMethod4;

          console.log('Endeavor: Selection changed', { isTask, colorId, endeavorId });

          if (isTask) {
            // Try to find the title input using multiple selectors
            const titleInput = dialog.querySelector('input[jsname="YPqjbf"]') ||
                              dialog.querySelector('input[aria-label="Title"]') ||
                              dialog.querySelector('input[type="text"]');

            console.log('Endeavor: Found title input:', titleInput);

            if (titleInput) {
              let title = titleInput.value;
              console.log('Endeavor: Current title:', title);

              // Remove any existing endeavor tag
              title = title.replace(/\s*\[Endeavor: [^\]]+\]$/, '').trim();

              if (endeavorId) {
                const selectedEndeavor = endeavors.find(e => e.id === endeavorId);
                if (selectedEndeavor) {
                  const newTitle = `${title} [Endeavor: ${selectedEndeavor.name}]`;
                  console.log('Endeavor: Setting new title:', newTitle);

                  // Focus the input first
                  titleInput.focus();

                  // Clear the current value
                  titleInput.value = '';
                  titleInput.dispatchEvent(new Event('input', { bubbles: true }));

                  // Type in the new value character by character
                  for (let i = 0; i < newTitle.length; i++) {
                    titleInput.value = newTitle.substring(0, i + 1);
                    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }

                  // Trigger final events
                  titleInput.dispatchEvent(new Event('change', { bubbles: true }));
                  titleInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                  titleInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                  titleInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
                  titleInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));

                  // Blur the input
                  titleInput.blur();
                  titleInput.dispatchEvent(new Event('blur', { bubbles: true }));

                  // Log the final state
                  console.log('Endeavor: Final title value:', titleInput.value);

                  // Apply color to the dialog
                  this.applyTaskColor(dialog, colorId);

                  // After setting the title, set up an observer to watch for the task appearing in the list
                  const taskListObserver = new MutationObserver((mutations, obs) => {
                    console.log('Endeavor: Checking for task chips');

                    // Look for task chips using the correct selectors
                    const taskChips = document.querySelectorAll('div[data-eventchip][data-eventid^="tasks_"]');
                    console.log('Endeavor: Found task chips:', taskChips.length);

                    for (const taskChip of taskChips) {
                      // Find the text content within the chip
                      const taskText = taskChip.querySelector('.WBi6vc')?.textContent || '';
                      console.log('Endeavor: Checking task chip:', taskText);

                      if (taskText.includes(`[Endeavor: ${selectedEndeavor.name}]`)) {
                        console.log('Endeavor: Found matching task chip, applying color');

                        const color = this.getColorById(colorId);
                        console.log('Endeavor: Applying color:', color);

                        // Style the chip container
                        taskChip.style.borderColor = color;

                        // Style the inner button
                        const innerButton = taskChip.querySelector('.KF4T6b');
                        if (innerButton) {
                          innerButton.style.backgroundColor = color;

                          // Calculate contrast color for text
                          const rgb = this.hexToRgb(color);
                          const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                          const textColor = brightness > 128 ? '#000000' : '#ffffff';

                          // Apply text color to the task name
                          const taskName = innerButton.querySelector('.WBi6vc');
                          if (taskName) {
                            taskName.style.color = textColor;
                          }

                          // Style the checkbox icon
                          const checkboxIcon = innerButton.querySelector('.jB5sh');
                          if (checkboxIcon) {
                            checkboxIcon.style.fill = textColor;
                          }
                        }

                        console.log('Endeavor: Task chip styling complete');
                        obs.disconnect();
                        break;
                      }
                    }
                  });

                  // Start observing for changes to the calendar view
                  console.log('Endeavor: Starting task chip observer');
                  taskListObserver.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true
                  });

                  // Stop observing after 5 seconds if we haven't found the task
                  setTimeout(() => {
                    taskListObserver.disconnect();
                    console.log('Endeavor: Task chip observer timed out');
                  }, 5000);
                }
              } else {
                // Clear endeavor tag if no endeavor selected
                titleInput.value = title;
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                titleInput.dispatchEvent(new Event('change', { bubbles: true }));
                this.applyTaskColor(dialog, null);
              }
            } else {
              console.log('Endeavor: Could not find title input');
            }
          } else {
            // Handle event color as before
            if (colorId) {
              setTimeout(() => {
                this.updateEventColor(colorId);
              }, 100);
            }
          }
        } catch (error) {
          console.log('Endeavor: Error in change handler:', error);
        }
      });

      // Add a mutation observer to monitor the dialog for any changes
      const dialogObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            const dialog = mutation.target.closest('[role="dialog"]');
            if (dialog) {
              const titleInput = dialog.querySelector('input[jsname="YPqjbf"]') ||
                                dialog.querySelector('input[aria-label="Title"]') ||
                                dialog.querySelector('input[type="text"]');

              if (titleInput && titleInput.value) {
                // Check if we need to restore the endeavor tag
                const match = titleInput.value.match(/^(.*?)\s*(?:\[Endeavor: ([^\]]+)\])?$/);
                if (match && match[2]) {
                  const baseTitle = match[1].trim();
                  const endeavorName = match[2];
                  const newTitle = `${baseTitle} [Endeavor: ${endeavorName}]`;

                  if (titleInput.value !== newTitle) {
                    console.log('Endeavor: Restoring title after mutation');
                    titleInput.value = newTitle;
                    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }
              }
            }
          }
        });
      });

      // Start observing the document for dialogs
      dialogObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });

      // Add some CSS to ensure proper styling
      const style = document.createElement('style');
      style.textContent = `
        .endeavor-selector {
          padding: 0 24px;
        }
        .endeavor-selector select {
          background-color: var(--gm-fillbutton-container-color, white);
          border: 1px solid var(--gm-hairline-color, #dadce0);
          border-radius: 4px;
          color: var(--gm-text-color, #3c4043);
          font-family: "Google Sans",Roboto,Arial,sans-serif;
          font-size: 14px;
          height: 36px;
          padding: 0 8px;
        }
        .endeavor-selector select:focus {
          border-color: #1a73e8;
          outline: none;
        }
      `;
      document.head.appendChild(style);

    } catch (error) {
      console.log('Endeavor: Error in injection:', error);
    }
  }

  adjustSelectorStyling(container, isTask) {
    const selector = container.querySelector('.endeavor-selector');
    if (!selector) return;

    if (isTask) {
      // Task-specific styling
      selector.style.padding = '0 16px';
      selector.style.margin = '8px 0';
    } else {
      // Event-specific styling
      selector.style.padding = '0';
      selector.style.margin = '8px 0';
    }
  }

  // Task-specific helper methods
  getTaskId(element) {
    const taskElement = element.closest('[data-task-id]') ||
                       element.querySelector('[data-task-id]');
    return taskElement?.getAttribute('data-task-id');
  }

  async getTaskEndeavor(taskId) {
    const result = await chrome.storage.sync.get('taskEndeavors');
    const taskEndeavors = result.taskEndeavors || {};
    return taskEndeavors[taskId];
  }

  async saveTaskEndeavor(taskId, endeavor) {
    const result = await chrome.storage.sync.get('taskEndeavors');
    const taskEndeavors = result.taskEndeavors || {};
    taskEndeavors[taskId] = endeavor;
    await chrome.storage.sync.set({ taskEndeavors });
  }

  async removeTaskEndeavor(taskId) {
    const result = await chrome.storage.sync.get('taskEndeavors');
    const taskEndeavors = result.taskEndeavors || {};
    delete taskEndeavors[taskId];
    await chrome.storage.sync.set({ taskEndeavors });
  }

  applyTaskColor(element, colorId) {
    if (!element) return;

    const color = colorId ? GOOGLE_CALENDAR_COLORS[colorId] : null;
    const taskContent = element.querySelector('[role="dialog"]') || element;

    if (taskContent) {
      if (color) {
        taskContent.style.backgroundColor = color;
        taskContent.style.color = this.getContrastColor(color);
      } else {
        taskContent.style.backgroundColor = '';
        taskContent.style.color = '';
      }
    }
  }

  updateTaskInList(taskId, colorId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      this.applyTaskColor(taskElement, colorId);
    }
  }

  async colorExistingTasks(container) {
    const taskElements = container.querySelectorAll('[data-task-id]');
    if (taskElements.length === 0) return;

    const result = await chrome.storage.sync.get('taskEndeavors');
    const taskEndeavors = result.taskEndeavors || {};

    taskElements.forEach(taskElement => {
      const taskId = this.getTaskId(taskElement);
      if (taskId && taskEndeavors[taskId]) {
        this.applyTaskColor(taskElement, taskEndeavors[taskId].colorId);
      }
    });
  }

  getContrastColor(backgroundColor) {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  // Keep existing event color method
  updateEventColor(colorId) {
    try {
      const colorNames = {
        '1': 'Lavender',
        '2': 'Sage',
        '3': 'Grape',
        '4': 'Flamingo',
        '5': 'Banana',
        '6': 'Tangerine',
        '7': 'Peacock',
        '8': 'Graphite',
        '9': 'Blueberry',
        '10': 'Basil',
        '11': 'Tomato'
      };

      // Function to find and click the color button
      const findAndClickColorButton = (attempts = 0) => {
        if (attempts > 5) {
          console.log('Endeavor: Max attempts reached trying to find color button');
          return;
        }

        // Try multiple selectors to find the color button
        const colorButton =
          document.querySelector('button[jsname="kRX3Ve"][aria-label*="event color"]') ||
          document.querySelector('.Gxz3Gc-LgbsSe.jMGPRc[aria-label*="event color"]') ||
          document.querySelector('button.jMGPRc[aria-haspopup="menu"]');

        if (colorButton) {
          console.log('Endeavor: Found color button');

          // Wait a moment before clicking
          setTimeout(() => {
            colorButton.click();
            console.log('Endeavor: Clicked color button');

            // Wait for color picker to appear (increased wait time)
            setTimeout(() => {
              const colorName = colorNames[colorId];
              console.log('Endeavor: Looking for color:', colorName);

              // Try multiple ways to find the color option with updated selectors
              const colorOption =
                document.querySelector(`.oMnJrf[data-text="${colorName}"]`) ||
                document.querySelector(`[jscontroller="eg8UTd"][data-text="${colorName}"]`) ||
                document.querySelector(`div[data-text="${colorName}"][aria-hidden="true"]`);

              if (colorOption) {
                console.log('Endeavor: Found color option:', {
                  name: colorOption.getAttribute('data-text'),
                  class: colorOption.className
                });

                // Find clickable element (updated to match new structure)
                const clickTarget = colorOption;

                if (clickTarget) {
                  // Wait a moment before clicking the color (increased wait time)
                  setTimeout(() => {
                    clickTarget.click();
                    console.log('Endeavor: Clicked color option');

                    // Close picker if needed (increased wait time)
                    setTimeout(() => {
                      const dialog = document.querySelector('[role="dialog"]');
                      if (dialog) {
                        dialog.click();
                      }
                    }, 200);
                  }, 100);
                }
              } else {
                console.log('Endeavor: Could not find color option');
              }
            }, 300);
          }, 100);
        } else {
          console.log('Endeavor: Color button not found, retrying...');
          setTimeout(() => findAndClickColorButton(attempts + 1), 200); // Increased retry delay
        }
      };

      // Start the process
      findAndClickColorButton();

    } catch (error) {
      console.log('Endeavor: Error updating color:', error);
    }
  }

  // Add method to color tasks in the task list
  colorTaskList() {
    // Find all task elements
    const taskElements = document.querySelectorAll('[data-task-id]');
    taskElements.forEach(taskElement => {
      // Find the task title
      const titleElement = taskElement.querySelector('[role="heading"]');
      if (titleElement) {
        const title = titleElement.textContent;
        const match = title.match(/\[Endeavor: ([^\]]+)\]/);
        if (match) {
          const endeavorName = match[1];
          // Find the endeavor by name
          const result = chrome.storage.sync.get('endeavors');
          const endeavors = result.endeavors || [];
          const endeavor = endeavors.find(e => e.name === endeavorName);
          if (endeavor) {
            this.applyTaskColor(taskElement, endeavor.colorId);
          }
        }
      }
    });
  }

  // Add observer for task list changes
  initializeTaskListObserver() {
    const taskListObserver = new MutationObserver(() => {
      this.colorTaskList();
    });

    // Find the task list container and observe it
    const taskList = document.querySelector('[role="complementary"]');
    if (taskList) {
      taskListObserver.observe(taskList, {
        childList: true,
        subtree: true
      });
    }
  }

  // Add helper methods if they don't exist
  getColorById(colorId) {
    const colorMap = {
      '1': '#7986cb',  // Lavender
      '2': '#33b679',  // Sage
      '3': '#8e24aa',  // Grape
      '4': '#e67c73',  // Flamingo
      '5': '#f6c026',  // Banana
      '6': '#f5511d',  // Tangerine
      '7': '#039be5',  // Peacock
      '8': '#616161',  // Graphite
      '9': '#3f51b5',  // Blueberry
      '10': '#0b8043', // Basil
      '11': '#d60000'  // Tomato
    };
    return colorMap[colorId];
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  initializeTaskColoring() {
    console.log('Endeavor: Initializing task coloring');

    // Try multiple selectors to find tasks
    const selectors = [
      'div[data-eventchip][data-eventid^="tasks_"]',
      '.vEJ0bc[data-eventid^="tasks_"]',
      '.ChfiMc[data-eventid^="tasks_"]',
      '[jscontroller="NAKBTc"]'
    ];

    const findTasks = () => {
      for (const selector of selectors) {
        const tasks = document.querySelectorAll(selector);
        if (tasks.length > 0) {
          console.log(`Endeavor: Found ${tasks.length} tasks using selector: ${selector}`);
          return tasks;
        }
      }
      return null;
    };

    // Function to retry finding and coloring tasks
    const retryColorTasks = (attempts = 0, maxAttempts = 5) => {
      console.log(`Endeavor: Attempt ${attempts + 1} to find tasks`);

      const tasks = findTasks();
      if (tasks && tasks.length > 0) {
        this.colorAllTasks(tasks);
      } else if (attempts < maxAttempts) {
        setTimeout(() => retryColorTasks(attempts + 1), 2000);
      } else {
        console.log('Endeavor: Failed to find tasks after all attempts');
      }
    };

    // Start the retry process
    retryColorTasks();

    // Set up observer for new tasks
    const taskObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const tasks = findTasks();
          if (tasks && tasks.length > 0) {
            console.log('Endeavor: New tasks detected, updating colors');
            this.colorAllTasks(tasks);
          }
        }
      }
    });

    // Try to find the best container to observe
    const containers = [
      document.querySelector('[role="main"]'),
      document.querySelector('[role="grid"]'),
      document.querySelector('.tEhMVd'), // Calendar grid
      document.querySelector('.QQYuzf')  // Week view container
    ].filter(Boolean);

    if (containers.length > 0) {
      containers.forEach(container => {
        taskObserver.observe(container, {
          childList: true,
          subtree: true,
          attributes: true
        });
      });
      console.log('Endeavor: Task observers started on containers:', containers.length);
    }
  }

  colorAllTasks(tasks) {
    console.log('Endeavor: Coloring tasks, found:', tasks.length);

    if (!this.endeavors) {
      console.error('Endeavor: No endeavors available for coloring tasks');
      return;
    }

    tasks.forEach(taskChip => {
      try {
        // Try multiple selectors to find the task text
        const taskText =
          taskChip.querySelector('.WBi6vc')?.textContent ||
          taskChip.querySelector('.nHqeVd')?.textContent ||
          taskChip.textContent || '';

        console.log('Endeavor: Processing task:', taskText);

        // Check for endeavor tag
        const match = taskText.match(/\[Endeavor: (.+?)\]/);
        if (match) {
          const endeavorName = match[1];
          console.log('Endeavor: Found endeavor tag:', endeavorName);

          // Find the endeavor in our list
          const endeavor = this.endeavors.find(e => e.name === endeavorName);
          if (endeavor) {
            const color = this.getColorById(endeavor.colorId);
            console.log('Endeavor: Applying color:', color, 'to task:', taskText);

            // Style the chip container
            taskChip.style.borderColor = color;

            // Try multiple selectors for the inner button
            const innerButton =
              taskChip.querySelector('.KF4T6b') ||
              taskChip.querySelector('[role="button"]');

            if (innerButton) {
              innerButton.style.backgroundColor = color;

              // Calculate contrast color for text
              const rgb = this.hexToRgb(color);
              const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
              const textColor = brightness > 128 ? '#000000' : '#ffffff';

              // Apply text color to all possible text containers
              const textElements = [
                innerButton.querySelector('.WBi6vc'),
                innerButton.querySelector('.nHqeVd'),
                ...innerButton.querySelectorAll('span:not([class])')
              ].filter(Boolean);

              textElements.forEach(el => {
                el.style.color = textColor;
              });

              // Style the checkbox icon
              const checkboxIcon = innerButton.querySelector('.jB5sh');
              if (checkboxIcon) {
                checkboxIcon.style.fill = textColor;
              }
            } else {
              console.log('Endeavor: No matching endeavor found for name:', endeavorName);
            }
          }
        }
      } catch (error) {
        console.error('Endeavor: Error processing task:', error);
      }
    });
  }

  // Add a debug method to check endeavors
  logEndeavorState() {
    console.log('Endeavor: Current endeavors:', this.endeavors);
  }
}

// Initialize
try {
  new CalendarIntegration();
} catch (error) {
  console.log('Endeavor: Error initializing calendar integration:', error);
}