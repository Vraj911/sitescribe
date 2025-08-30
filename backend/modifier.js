// backend/modifier.js
const fs = require('fs');
const cheerio = require('cheerio');

/**
 * Safely write content to a file
 */
function writeFileSafe(filePath, content) {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        return false;
    }
}

/**
 * Change text content of an element
 */
function changeText(file, selector, oldText, newText) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const elements = $(selector);
        if (elements.length === 0) {
            return { success: false, error: `No elements found with selector: ${selector}` };
        }
        
        elements.each((index, element) => {
            const $el = $(element);
            const currentText = $el.text();
            if (currentText.includes(oldText)) {
                $el.text(currentText.replace(oldText, newText));
            }
        });
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Add a new HTML block
 */
function addBlock(file, parentSelector, htmlBlock) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const parent = $(parentSelector);
        if (parent.length === 0) {
            return { success: false, error: `Parent element not found: ${parentSelector}` };
        }
        
        parent.append(htmlBlock);
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Update image source
 */
function updateImage(file, selector, newSrc) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const images = $(selector);
        if (images.length === 0) {
            return { success: false, error: `No images found with selector: ${selector}` };
        }
        
        images.attr('src', newSrc);
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Change CSS style property
 */
function changeStyle(file, selector, property, value) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const elements = $(selector);
        if (elements.length === 0) {
            return { success: false, error: `No elements found with selector: ${selector}` };
        }
        
        elements.each((index, element) => {
            const $el = $(element);
            const currentStyle = $el.attr('style') || '';
            const styleObj = {};
            
            // Parse existing styles
            currentStyle.split(';').forEach(rule => {
                const [prop, val] = rule.split(':').map(s => s.trim());
                if (prop && val) {
                    styleObj[prop] = val;
                }
            });
            
            // Update the property
            styleObj[property] = value;
            
            // Convert back to string
            const newStyle = Object.entries(styleObj)
                .map(([prop, val]) => `${prop}: ${val}`)
                .join('; ');
            
            $el.attr('style', newStyle);
        });
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Modify an attribute of an element
 */
function modifyAttribute(file, selector, attribute, value) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const elements = $(selector);
        if (elements.length === 0) {
            return { success: false, error: `No elements found with selector: ${selector}` };
        }
        
        elements.attr(attribute, value);
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Add an attribute to an element
 */
function addAttribute(file, selector, attribute, value) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const elements = $(selector);
        if (elements.length === 0) {
            return { success: false, error: `No elements found with selector: ${selector}` };
        }
        
        elements.attr(attribute, value);
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Remove an attribute from an element
 */
function removeAttribute(file, selector, attribute) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const elements = $(selector);
        if (elements.length === 0) {
            return { success: false, error: `No elements found with selector: ${selector}` };
        }
        
        elements.removeAttr(attribute);
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Modify multiple style properties at once
 */
function modifyStyle(file, selector, style) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const elements = $(selector);
        if (elements.length === 0) {
            return { success: false, error: `No elements found with selector: ${selector}` };
        }
        
        elements.each((index, element) => {
            const $el = $(element);
            const currentStyle = $el.attr('style') || '';
            const styleObj = {};
            
            // Parse existing styles
            currentStyle.split(';').forEach(rule => {
                const [prop, val] = rule.split(':').map(s => s.trim());
                if (prop && val) {
                    styleObj[prop] = val;
                }
            });
            
            // Parse new styles
            style.split(';').forEach(rule => {
                const [prop, val] = rule.split(':').map(s => s.trim());
                if (prop && val) {
                    styleObj[prop] = val;
                }
            });
            
            // Convert back to string
            const newStyle = Object.entries(styleObj)
                .map(([prop, val]) => `${prop}: ${val}`)
                .join('; ');
            
            $el.attr('style', newStyle);
        });
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Create a backup of a file
 */
function backup(file, timestamp) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const backupPath = `${file}.backup.${timestamp}`;
        const success = writeFileSafe(backupPath, content);
        return { success, backupPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Apply a template to a file
 */
function applyTemplate(file, templateType) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        let templateStyles = '';
        
        switch (templateType) {
            case 'modern':
                templateStyles = `
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                    h1, h2, h3 { color: #2c3e50; margin-bottom: 1rem; }
                    p { margin-bottom: 1rem; }
                    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
                    .btn { background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
                    .card { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; margin: 20px 0; }
                `;
                break;
            case 'professional':
                templateStyles = `
                    body { font-family: 'Georgia', serif; line-height: 1.8; color: #2c3e50; background: #f8f9fa; }
                    h1, h2, h3 { color: #1a252f; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
                    p { text-align: justify; }
                    .container { max-width: 1000px; margin: 0 auto; padding: 20px; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
                    .btn { background: #2c3e50; color: white; padding: 12px 24px; border: none; border-radius: 3px; font-weight: bold; }
                `;
                break;
            case 'minimal':
                templateStyles = `
                    body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background: white; }
                    h1, h2, h3 { color: #000; font-weight: 300; }
                    p { color: #666; }
                    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
                    .btn { background: #000; color: white; padding: 10px 20px; border: none; }
                `;
                break;
            case 'colorful':
                templateStyles = `
                    body { font-family: 'Comic Sans MS', cursive; line-height: 1.6; color: #333; background: linear-gradient(45deg, #ff6b6b, #4ecdc4); }
                    h1, h2, h3 { color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
                    p { color: #fff; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
                    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                    .btn { background: #ffd93d; color: #333; padding: 12px 24px; border: none; border-radius: 25px; font-weight: bold; }
                `;
                break;
        }
        
        // Add or update style tag
        let styleTag = $('style');
        if (styleTag.length === 0) {
            $('head').append(`<style>${templateStyles}</style>`);
        } else {
            styleTag.html(templateStyles);
        }
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Add animation to elements
 */
function addAnimation(file, selector, animationType) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const $ = cheerio.load(content);
        
        const elements = $(selector);
        if (elements.length === 0) {
            return { success: false, error: `No elements found with selector: ${selector}` };
        }
        
        let animationCSS = '';
        let animationClass = '';
        
        switch (animationType) {
            case 'fade':
                animationCSS = `
                    .fade-in { animation: fadeIn 1s ease-in; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                `;
                animationClass = 'fade-in';
                break;
            case 'slide':
                animationCSS = `
                    .slide-in { animation: slideIn 0.8s ease-out; }
                    @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
                `;
                animationClass = 'slide-in';
                break;
            case 'bounce':
                animationCSS = `
                    .bounce { animation: bounce 1s ease-in-out; }
                    @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-30px); } 60% { transform: translateY(-15px); } }
                `;
                animationClass = 'bounce';
                break;
            case 'rotate':
                animationCSS = `
                    .rotate { animation: rotate 2s linear infinite; }
                    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `;
                animationClass = 'rotate';
                break;
        }
        
        // Add animation CSS
        let styleTag = $('style');
        if (styleTag.length === 0) {
            $('head').append(`<style>${animationCSS}</style>`);
        } else {
            styleTag.append(animationCSS);
        }
        
        // Add animation class to elements
        elements.addClass(animationClass);
        
        const success = writeFileSafe(file, $.html());
        return { success, content: $.html() };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Change application theme
 */
function changeTheme(theme) {
    try {
        // This would typically update the Electron app's theme
        // For now, we'll return a success response
        return { 
            success: true, 
            message: `Theme changed to ${theme}`,
            theme: theme
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Change font size
 */
function changeFontSize(size) {
    try {
        // This would typically update the Electron app's font size
        return { 
            success: true, 
            message: `Font size changed to ${size}`,
            size: size
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Change language
 */
function changeLanguage(language) {
    try {
        // This would typically update the Electron app's language
        return { 
            success: true, 
            message: `Language changed to ${language}`,
            language: language
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Set auto-save setting
 */
function setAutoSave(enabled) {
    try {
        // This would typically update the app's auto-save setting
        return { 
            success: true, 
            message: `Auto-save ${enabled ? 'enabled' : 'disabled'}`,
            autoSave: enabled
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Show keyboard shortcuts
 */
function showShortcuts() {
    try {
        const shortcuts = {
            'Ctrl+S': 'Save file',
            'Ctrl+O': 'Open file',
            'Ctrl+N': 'New file',
            'Ctrl+Z': 'Undo',
            'Ctrl+Y': 'Redo',
            'F1': 'Help',
            'Ctrl+Shift+T': 'Toggle theme',
            'Ctrl+Shift+F': 'Toggle fullscreen'
        };
        
        return { 
            success: true, 
            message: 'Keyboard shortcuts displayed',
            shortcuts: shortcuts
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Show file history
 */
function showFileHistory() {
    try {
        // This would typically return recent files from app storage
        const recentFiles = [
            'index.html',
            'about.html',
            'contact.html'
        ];
        
        return { 
            success: true, 
            message: 'File history displayed',
            recentFiles: recentFiles
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Export settings
 */
function exportSettings() {
    try {
        const settings = {
            theme: 'default',
            fontSize: 'medium',
            language: 'english',
            autoSave: true,
            notifications: true
        };
        
        return { 
            success: true, 
            message: 'Settings exported successfully',
            settings: settings
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Import settings
 */
function importSettings() {
    try {
        return { 
            success: true, 
            message: 'Settings imported successfully'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Set notifications
 */
function setNotifications(enabled) {
    try {
        return { 
            success: true, 
            message: `Notifications ${enabled ? 'enabled' : 'disabled'}`,
            notifications: enabled
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Set fullscreen mode
 */
function setFullscreen(enabled) {
    try {
        return { 
            success: true, 
            message: `Fullscreen mode ${enabled ? 'enabled' : 'disabled'}`,
            fullscreen: enabled
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Show help
 */
function showHelp() {
    try {
        const helpContent = {
            title: 'SiteScribe Help',
            sections: [
                {
                    title: 'Basic Commands',
                    commands: [
                        'Change text: "change heading to Welcome"',
                        'Set background: "set background to blue"',
                        'Add form: "add contact form"'
                    ]
                },
                {
                    title: 'App Features',
                    commands: [
                        'Change theme: "change theme to dark"',
                        'Set font size: "set font size to large"',
                        'Show shortcuts: "show keyboard shortcuts"'
                    ]
                }
            ]
        };
        
        return { 
            success: true, 
            message: 'Help displayed',
            help: helpContent
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Show about information
 */
function showAbout() {
    try {
        const aboutInfo = {
            name: 'SiteScribe',
            version: '1.0.0',
            description: 'AI-powered website editor',
            author: 'SiteScribe Team',
            features: [
                'Natural language commands',
                'Real-time editing',
                'Multiple themes',
                'Auto-save functionality'
            ]
        };
        
        return { 
            success: true, 
            message: 'About information displayed',
            about: aboutInfo
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Reset settings to default
 */
function resetSettings() {
    try {
        return { 
            success: true, 
            message: 'Settings reset to default values'
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Apply multiple actions to files
 */
async function applyActions(actions) {
    const results = [];
    
    for (const action of actions) {
        try {
            let result;
            
            switch (action.action) {
                case 'changeText':
                    result = changeText(action.file, action.selector, action.oldText, action.newText);
                    break;
                case 'addBlock':
                    result = addBlock(action.file, action.parentSelector, action.htmlBlock);
                    break;
                case 'updateImage':
                    result = updateImage(action.file, action.selector, action.newSrc);
                    break;
                case 'changeStyle':
                    result = changeStyle(action.file, action.selector, action.property, action.value);
                    break;
                case 'modifyAttribute':
                    result = modifyAttribute(action.file, action.selector, action.attribute, action.value);
                    break;
                case 'addAttribute':
                    result = addAttribute(action.file, action.selector, action.attribute, action.value);
                    break;
                case 'removeAttribute':
                    result = removeAttribute(action.file, action.selector, action.attribute);
                    break;
                case 'modifyStyle':
                    result = modifyStyle(action.file, action.selector, action.style);
                    break;
                case 'backup':
                    result = backup(action.file, action.timestamp);
                    break;
                case 'applyTemplate':
                    result = applyTemplate(action.file, action.templateType);
                    break;
                case 'addAnimation':
                    result = addAnimation(action.file, action.selector, action.animationType);
                    break;
                case 'changeTheme':
                    result = changeTheme(action.theme);
                    break;
                case 'changeFontSize':
                    result = changeFontSize(action.size);
                    break;
                case 'changeLanguage':
                    result = changeLanguage(action.language);
                    break;
                case 'setAutoSave':
                    result = setAutoSave(action.enabled);
                    break;
                case 'showShortcuts':
                    result = showShortcuts();
                    break;
                case 'showFileHistory':
                    result = showFileHistory();
                    break;
                case 'exportSettings':
                    result = exportSettings();
                    break;
                case 'importSettings':
                    result = importSettings();
                    break;
                case 'setNotifications':
                    result = setNotifications(action.enabled);
                    break;
                case 'setFullscreen':
                    result = setFullscreen(action.enabled);
                    break;
                case 'showHelp':
                    result = showHelp();
                    break;
                case 'showAbout':
                    result = showAbout();
                    break;
                case 'resetSettings':
                    result = resetSettings();
                    break;
                default:
                    result = { success: false, error: `Unknown action: ${action.action}` };
            }
            
            results.push({
                action: action.action,
                file: action.file,
                selector: action.selector,
                status: result.success ? 'modified' : 'error',
                error: result.error,
                message: result.success ? 'Successfully applied changes' : result.error
            });
            
        } catch (error) {
            results.push({
                action: action.action,
                file: action.file,
                selector: action.selector,
                status: 'error',
                error: error.message,
                message: `Failed to apply action: ${error.message}`
            });
        }
    }
    
    return { results };
}

module.exports = { 
    applyActions, 
    changeText, 
    addBlock, 
    updateImage, 
    changeStyle,
    modifyAttribute,
    addAttribute,
    removeAttribute,
    modifyStyle,
    backup,
    applyTemplate,
    addAnimation,
    changeTheme,
    changeFontSize,
    changeLanguage,
    setAutoSave,
    showShortcuts,
    showFileHistory,
    exportSettings,
    importSettings,
    setNotifications,
    setFullscreen,
    showHelp,
    showAbout,
    resetSettings
};
