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
    this.isColorPickerOpen = false; // Track color picker state
    this.initializeObserver();

    // Add listener for extension context invalidation
    chrome.runtime.onConnect.addListener(() => {
      console.log('Endeavor: Extension context reconnected');
      this.initializeObserver();
    });
  }

  initializeObserver() {
    console.log('Endeavor: Setting up mutation observer');

    // Disconnect existing observer if any
    if (this.observer) {
      this.observer.disconnect();
    }

    try {
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              const dialog = node.matches('[role="dialog"]') ?
                node : node.querySelector('[role="dialog"]');

              if (dialog?.classList.contains('Inn9w')) {
                // Check if we've already processed this dialog
                if (!dialog.hasAttribute('data-endeavor-processed')) {
                  // Mark the dialog as processed
                  dialog.setAttribute('data-endeavor-processed', 'true');
                  this.waitForDialogContent(dialog).catch(error => {
                    console.log('Endeavor: Error in dialog handling:', error);
                  });
                }
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

  async waitForDialogContent(dialog) {
    const maxAttempts = 20;
    let attempts = 0;

    const checkContent = async () => {
      try {
        const titleInput = dialog.querySelector('input[aria-label="Add title"]');

        if (titleInput) {
          const formContainer = titleInput.closest('.mvRfff');

          if (formContainer) {
            // Check if this form container already has our selector
            if (!formContainer.querySelector('.endeavor-selector')) {
              console.log('Endeavor: Found unprocessed form container');
              await this.injectEndeavorSelector(formContainer);
            } else {
              console.log('Endeavor: Form container already has selector');
            }
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkContent, 150);
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkContent, 150);
        }
      } catch (error) {
        console.log('Endeavor: Error in checkContent:', error);
      }
    };

    await checkContent();
  }

  async injectEndeavorSelector(targetElement) {
    try {
      if (targetElement.querySelector('.endeavor-selector')) {
        console.log('Endeavor: Selector already exists, skipping injection');
        return;
      }

      console.log('Endeavor: Starting selector injection');

      const result = await chrome.storage.sync.get('endeavors');
      const endeavors = result.endeavors || [];

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'Fgl6fe-fmcmS-yrriRe-OWXEXe-H9tDt endeavor-selector';
      wrapper.setAttribute('data-endeavor-injected', 'true');
      wrapper.style.marginTop = '8px';

      const container = document.createElement('div');
      container.className = 'Fgl6fe-fmcmS-yrriRe';

      const labelContainer = document.createElement('div');
      labelContainer.className = 'Fgl6fe-fmcmS-yrriRe-L6cTce';

      const label = document.createElement('div');
      label.className = 'Fgl6fe-fmcmS-yrriRe-JNdkSc';
      label.textContent = 'Endeavor';

      const selectContainer = document.createElement('div');
      selectContainer.className = 'Fgl6fe-fmcmS-wGMbrd-sM5MNb';

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

      // Assemble elements
      labelContainer.appendChild(label);
      selectContainer.appendChild(select);
      container.appendChild(labelContainer);
      container.appendChild(selectContainer);
      wrapper.appendChild(container);

      // Find injection point
      const titleContainer = targetElement.querySelector('.Fgl6fe-fmcmS-yrriRe-OWXEXe-MFS4be');

      if (titleContainer) {
        // One final check before injection
        if (!titleContainer.nextSibling?.hasAttribute('data-endeavor-injected')) {
          titleContainer.parentNode.insertBefore(wrapper, titleContainer.nextSibling);
          console.log('Endeavor: Injection complete');

          // Updated color handling
          select.addEventListener('change', (e) => {
            try {
              const selectedOption = e.target.options[e.target.selectedIndex];
              const colorId = selectedOption.getAttribute('data-color-id');
              if (colorId) {
                // Add a small delay before triggering the color update
                setTimeout(() => {
                  this.updateEventColor(colorId);
                }, 100);
              }
            } catch (error) {
              console.log('Endeavor: Error in change handler:', error);
            }
          });
        } else {
          console.log('Endeavor: Injection point already has selector');
        }
      }
    } catch (error) {
      console.log('Endeavor: Error in injection:', error);
      if (!chrome.runtime?.id) {
        // If the error is due to invalid context, reload the page
        window.location.reload();
      }
    }
  }

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
}

// Initialize with error handling
try {
  new CalendarIntegration();
} catch (error) {
  console.log('Endeavor: Error initializing extension:', error);
}

// Also add a backup initialization
window.addEventListener('load', () => {
  console.log('Endeavor: Window load event fired');
  // Check if we already initialized
  if (!window.endeavorIntegration) {
    window.endeavorIntegration = new CalendarIntegration();
  }
});