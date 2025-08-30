const fetch = require('node-fetch');

function buildSystemPrompt() {
    return `You are a website content editing planner. Given a user command and site content, return a JSON array of actions to perform.

Each action should be an object with:
- action: "changeText", "addBlock", "updateImage", or "changeStyle"
- file: the file path to modify
- selector: CSS selector to target elements
- oldText: text to replace (for changeText)
- newText: new text content (for changeText)
- parentSelector: where to add new content (for addBlock)
- htmlBlock: HTML to insert (for addBlock)
- newSrc: new image source (for updateImage)
- property: CSS property name (for changeStyle)
- value: CSS property value (for changeStyle)

Return only valid JSON array.`;
}

function buildUserPrompt(siteIndex, userCommand) {
    const summary = siteIndex.kb
        .slice(0, 30)
        .map(entry => {
            if (entry.type === 'html') {
                const heads = entry.items.filter(i => i.type === 'h1' || i.type === 'h2').slice(0, 3).map(i => i.text);
                return `HTML ${entry.file}: headings=${JSON.stringify(heads)}`;
            }
            return `TEXT ${entry.file}: firstLine=${JSON.stringify(entry.lines[0] || '')}`;
        })
        .join('\n');
    return `User command: ${userCommand}\nSite summary:\n${summary}`;
}

async function tryOpenAI(messages) {
    const key = process.env.OPENAI_API_KEY;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages,
            temperature: 0.1
        })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    try { return JSON.parse(content); } catch { return []; }
}

async function interpretCommand(siteIndex, userCommand) {
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(siteIndex, userCommand) }
    ];

    try {
        const actions = await tryOpenAI(messages);
        if (actions && actions.length) return actions;
    } catch (err) {
        console.log('OpenAI failed:', err.message);
    }

    // Fallback: simple command interpreter
    return interpretSimpleCommand(siteIndex, userCommand);
}

function interpretSimpleCommand(siteIndex, userCommand) {
    const lowerCommand = userCommand.toLowerCase();
    const actions = [];
    
    console.log('Interpreting command:', userCommand);
    console.log('Lower command:', lowerCommand);
    
    // Find HTML files
    const htmlFiles = siteIndex.kb.filter(entry => entry.type === 'html');
    if (htmlFiles.length === 0) return actions;
    
    const htmlFile = htmlFiles[0].file;
    console.log('HTML file to modify:', htmlFile);
    
    // Background color commands
    if (lowerCommand.includes('bgcolor') || lowerCommand.includes('background color') || lowerCommand.includes('background-color')) {
        // Extract color after "to", "as", "set", or "make" - support more color formats
        const colorMatch = lowerCommand.match(/(?:to|as|set|make)\s+(\w+(?:-\w+)?)(?:\s+color)?$/);
        if (colorMatch) {
            const color = colorMatch[1];
            // Skip if the color is actually a command word
            if (!['bgcolor', 'background', 'color', 'set', 'make', 'to', 'as'].includes(color)) {
                actions.push({
                    action: 'changeStyle',
                    file: htmlFile,
                    selector: 'body',
                    property: 'background-color',
                    value: color
                });
            }
        }
    }
    
    // Text color commands (only if not background color)
    if (!lowerCommand.includes('bgcolor') && !lowerCommand.includes('background') && 
        (lowerCommand.includes('text color') || lowerCommand.includes('text-color') || lowerCommand.includes('color'))) {
        const colorMatch = lowerCommand.match(/(?:to|as|set|make)\s+(\w+)/);
        if (colorMatch) {
            const color = colorMatch[1];
            if (!['text', 'color', 'set', 'make', 'to', 'as'].includes(color)) {
                actions.push({
                    action: 'changeStyle',
                    file: htmlFile,
                    selector: 'body',
                    property: 'color',
                    value: color
                });
            }
        }
    }
    
    // Font size commands
    if (lowerCommand.includes('font size') || lowerCommand.includes('font-size') || lowerCommand.includes('text size')) {
        console.log('Font size command detected');
        // Match size with optional units (px, em, rem, %, etc.)
        const sizeMatch = lowerCommand.match(/(?:to|as|set|make)\s+(\w+(?:px|em|rem|%|pt)?)/);
        console.log('Size match result:', sizeMatch);
        if (sizeMatch) {
            const size = sizeMatch[1];
            console.log('Extracted size:', size);
            if (!['font', 'size', 'text', 'set', 'make', 'to', 'as'].includes(size)) {
                actions.push({
                    action: 'changeStyle',
                    file: htmlFile,
                    selector: 'body',
                    property: 'font-size',
                    value: size
                });
                console.log('Added font size action:', size);
            } else {
                console.log('Size filtered out as command word:', size);
            }
        } else {
            console.log('No size match found');
        }
    }
    
    // Heading text changes
    if (lowerCommand.includes('change heading') || lowerCommand.includes('change h1') || 
        lowerCommand.includes('change h2') || lowerCommand.includes('change h3')) {
        console.log('Heading change command detected');
        
        let headingSelector = 'h1';
        if (lowerCommand.includes('h2')) headingSelector = 'h2';
        else if (lowerCommand.includes('h3')) headingSelector = 'h3';
        
        const newTextMatch = lowerCommand.match(/to\s+(.+?)(?:\s+and|\s+with|$)/);
        if (newTextMatch) {
            const newText = newTextMatch[1].trim();
            actions.push({
                action: 'changeText',
                file: htmlFile,
                selector: headingSelector,
                oldText: '.*', // Match any text
                newText: newText
            });
            console.log('Added heading change action:', { selector: headingSelector, newText: newText });
        }
    }

    // Paragraph text changes
    if (lowerCommand.includes('change paragraph') || lowerCommand.includes('change p') || 
        lowerCommand.includes('change paragraph text') || lowerCommand.includes('modify paragraph')) {
        console.log('Paragraph change command detected');
        
        const newTextMatch = lowerCommand.match(/to\s+(.+?)(?:\s+and|\s+with|$)/);
        if (newTextMatch) {
            const newText = newTextMatch[1].trim();
            actions.push({
                action: 'changeText',
                file: htmlFile,
                selector: 'p',
                oldText: '.*', // Match any text
                newText: newText
            });
            console.log('Added paragraph change action:', { newText: newText });
        }
    }

    // General text changes
    if (lowerCommand.includes('change text') || lowerCommand.includes('modify text') || 
        lowerCommand.includes('update text') || lowerCommand.includes('set text')) {
        console.log('General text change command detected');
        
        let textSelector = 'body';
        let oldText = '';
        let newText = '';
        
        // Extract old text (if specified)
        const oldTextMatch = lowerCommand.match(/(?:from|old|current)\s+(.+?)\s+to/);
        if (oldTextMatch) {
            oldText = oldTextMatch[1].trim();
        }
        
        // Extract new text
        const newTextMatch = lowerCommand.match(/to\s+(.+?)(?:\s+and|\s+with|$)/);
        if (newTextMatch) {
            newText = newTextMatch[1].trim();
        }
        
        // Determine selector based on context
        if (lowerCommand.includes('heading') || lowerCommand.includes('h1') || lowerCommand.includes('h2') || lowerCommand.includes('h3')) {
            textSelector = 'h1, h2, h3';
        } else if (lowerCommand.includes('paragraph') || lowerCommand.includes('p')) {
            textSelector = 'p';
        } else if (lowerCommand.includes('title')) {
            textSelector = 'title';
        } else if (lowerCommand.includes('button')) {
            textSelector = 'button';
        } else if (lowerCommand.includes('link') || lowerCommand.includes('a')) {
            textSelector = 'a';
        }
        
        if (newText) {
            actions.push({
                action: 'changeText',
                file: htmlFile,
                selector: textSelector,
                oldText: oldText || '.*',
                newText: newText
            });
            console.log('Added general text change action:', { selector: textSelector, oldText: oldText, newText: newText });
        }
    }
    
    // Add input field commands
    console.log('Checking for input commands...');
    console.log('Contains "add input":', lowerCommand.includes('add input'));
    console.log('Contains "add textbox":', lowerCommand.includes('add textbox'));
    console.log('Contains "add text field":', lowerCommand.includes('add text field'));
    console.log('Contains "add" and "input":', lowerCommand.includes('add') && lowerCommand.includes('input'));
    
    if (lowerCommand.includes('add input') || lowerCommand.includes('add textbox') || lowerCommand.includes('add text field') || 
        (lowerCommand.includes('add') && lowerCommand.includes('input'))) {
        console.log('Add input command detected');
        let inputType = 'text';
        let placeholder = '';
        let inputName = 'input';
        
        // Extract input type
        if (lowerCommand.includes('password')) {
            inputType = 'password';
            console.log('Detected password input type');
        } else if (lowerCommand.includes('email')) {
            inputType = 'email';
            console.log('Detected email input type');
        } else if (lowerCommand.includes('number')) {
            inputType = 'number';
            console.log('Detected number input type');
        } else if (lowerCommand.includes('textarea')) {
            inputType = 'textarea';
            console.log('Detected textarea input type');
        } else if (lowerCommand.includes('date')) {
            inputType = 'date';
            console.log('Detected date input type');
        } else if (lowerCommand.includes('time')) {
            inputType = 'time';
            console.log('Detected time input type');
        } else if (lowerCommand.includes('datetime')) {
            inputType = 'datetime-local';
            console.log('Detected datetime input type');
        } else if (lowerCommand.includes('url') || lowerCommand.includes('link')) {
            inputType = 'url';
            console.log('Detected URL input type');
        } else if (lowerCommand.includes('tel') || lowerCommand.includes('phone')) {
            inputType = 'tel';
            console.log('Detected phone input type');
        } else if (lowerCommand.includes('file')) {
            inputType = 'file';
            console.log('Detected file input type');
        } else if (lowerCommand.includes('checkbox')) {
            inputType = 'checkbox';
            console.log('Detected checkbox input type');
        } else if (lowerCommand.includes('radio')) {
            inputType = 'radio';
            console.log('Detected radio input type');
        } else if (lowerCommand.includes('range') || lowerCommand.includes('slider')) {
            inputType = 'range';
            console.log('Detected range input type');
        } else if (lowerCommand.includes('color')) {
            inputType = 'color';
            console.log('Detected color input type');
        } else if (lowerCommand.includes('search')) {
            inputType = 'search';
            console.log('Detected search input type');
        }
        
        // Extract placeholder text
        const placeholderMatch = lowerCommand.match(/placeholder\s+(.+?)(?:\s+and|\s+with|$)/);
        if (placeholderMatch) {
            placeholder = placeholderMatch[1].trim();
            console.log('Extracted placeholder:', placeholder);
        } else {
            console.log('No placeholder found');
        }
        
        // Extract name
        const nameMatch = lowerCommand.match(/name\s+(.+?)(?:\s+and|\s+with|$)/);
        if (nameMatch) {
            inputName = nameMatch[1].trim();
            console.log('Extracted name:', inputName);
        } else {
            console.log('Using default name:', inputName);
        }
        
        // Extract additional attributes
        let minValue = '';
        let maxValue = '';
        let stepValue = '';
        let isRequired = false;
        let defaultValue = '';
        
        // Extract min value
        const minMatch = lowerCommand.match(/min\s+(\d+)/);
        if (minMatch) {
            minValue = minMatch[1];
            console.log('Extracted min value:', minValue);
        }
        
        // Extract max value
        const maxMatch = lowerCommand.match(/max\s+(\d+)/);
        if (maxMatch) {
            maxValue = maxMatch[1];
            console.log('Extracted max value:', maxValue);
        }
        
        // Extract step value
        const stepMatch = lowerCommand.match(/step\s+(\d+)/);
        if (stepMatch) {
            stepValue = stepMatch[1];
            console.log('Extracted step value:', stepValue);
        }
        
        // Check if required
        if (lowerCommand.includes('required')) {
            isRequired = true;
            console.log('Input marked as required');
        }
        
        // Extract default value
        const defaultMatch = lowerCommand.match(/default\s+(.+?)(?:\s+and|\s+with|$)/);
        if (defaultMatch) {
            defaultValue = defaultMatch[1].trim();
            console.log('Extracted default value:', defaultValue);
        }
        
        // Build attributes string
        let attributes = `name="${inputName}"`;
        if (placeholder) attributes += ` placeholder="${placeholder}"`;
        if (minValue) attributes += ` min="${minValue}"`;
        if (maxValue) attributes += ` max="${maxValue}"`;
        if (stepValue) attributes += ` step="${stepValue}"`;
        if (isRequired) attributes += ` required`;
        if (defaultValue) attributes += ` value="${defaultValue}"`;
        
        let htmlBlock;
        if (inputType === 'textarea') {
            htmlBlock = `<textarea ${attributes} style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">${defaultValue}</textarea>`;
        } else {
            htmlBlock = `<input type="${inputType}" ${attributes} style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">`;
        }
        
        console.log('Generated HTML block:', htmlBlock);
        
        actions.push({
            action: 'addBlock',
            file: htmlFile,
            parentSelector: 'body',
            htmlBlock: htmlBlock
        });
        
        console.log('Added input field action:', { type: inputType, name: inputName, placeholder });
    } else {
        console.log('No input command detected in:', lowerCommand);
    }
    
    // Add form commands
    console.log('Checking for form commands...');
    console.log('Contains "add form":', lowerCommand.includes('add form'));
    console.log('Contains "add contact form":', lowerCommand.includes('add contact form'));
    console.log('Contains "add login form":', lowerCommand.includes('add login form'));
    console.log('Contains "add registration form":', lowerCommand.includes('add registration form'));
    
    if (lowerCommand.includes('add form') || lowerCommand.includes('create form') || 
        lowerCommand.includes('add contact form') || lowerCommand.includes('add login form') ||
        lowerCommand.includes('add registration form') || lowerCommand.includes('add signup form') ||
        lowerCommand.includes('add search form') || lowerCommand.includes('add feedback form') ||
        lowerCommand.includes('add order form')) {
        console.log('Add form command detected');
        let formAction = '';
        let formMethod = 'post';
        let formType = 'contact';
        
        // Extract form type
        if (lowerCommand.includes('contact form')) {
            formType = 'contact';
        } else if (lowerCommand.includes('login form')) {
            formType = 'login';
        } else if (lowerCommand.includes('registration form') || lowerCommand.includes('signup form')) {
            formType = 'registration';
        } else if (lowerCommand.includes('search form')) {
            formType = 'search';
        } else if (lowerCommand.includes('feedback form')) {
            formType = 'feedback';
        } else if (lowerCommand.includes('order form')) {
            formType = 'order';
        }
        
        // Extract form action
        const actionMatch = lowerCommand.match(/action\s+(.+?)(?:\s+and|\s+with|$)/);
        if (actionMatch) {
            formAction = actionMatch[1].trim();
        }
        
        // Extract form method
        if (lowerCommand.includes('get method')) {
            formMethod = 'get';
        }
        
        let formHtml = '';
        
        switch (formType) {
            case 'contact':
                formHtml = `<form action="${formAction}" method="${formMethod}" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
    <h3 style="margin-bottom: 20px; color: #333;">Contact Us</h3>
    <div style="margin-bottom: 15px;">
        <label for="name" style="display: block; margin-bottom: 5px; font-weight: bold;">Full Name:</label>
        <input type="text" id="name" name="name" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address:</label>
        <input type="email" id="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="phone" style="display: block; margin-bottom: 5px; font-weight: bold;">Phone Number:</label>
        <input type="tel" id="phone" name="phone" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="subject" style="display: block; margin-bottom: 5px; font-weight: bold;">Subject:</label>
        <input type="text" id="subject" name="subject" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 20px;">
        <label for="message" style="display: block; margin-bottom: 5px; font-weight: bold;">Message:</label>
        <textarea id="message" name="message" rows="5" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
    </div>
    <button type="submit" style="background-color: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Send Message</button>
</form>`;
                break;
                
            case 'login':
                formHtml = `<form action="${formAction}" method="${formMethod}" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9; max-width: 400px;">
    <h3 style="margin-bottom: 20px; color: #333; text-align: center;">Login</h3>
    <div style="margin-bottom: 15px;">
        <label for="username" style="display: block; margin-bottom: 5px; font-weight: bold;">Username or Email:</label>
        <input type="text" id="username" name="username" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="password" style="display: block; margin-bottom: 5px; font-weight: bold;">Password:</label>
        <input type="password" id="password" name="password" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center;">
            <input type="checkbox" name="remember" style="margin-right: 8px;">
            Remember me
        </label>
    </div>
    <button type="submit" style="width: 100%; background-color: #28a745; color: white; padding: 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Login</button>
    <p style="text-align: center; margin-top: 15px;">
        <a href="#" style="color: #007bff; text-decoration: none;">Forgot Password?</a>
    </p>
</form>`;
                break;
                
            case 'registration':
                formHtml = `<form action="${formAction}" method="${formMethod}" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
    <h3 style="margin-bottom: 20px; color: #333;">Create Account</h3>
    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <div style="flex: 1;">
            <label for="firstname" style="display: block; margin-bottom: 5px; font-weight: bold;">First Name:</label>
            <input type="text" id="firstname" name="firstname" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
        </div>
        <div style="flex: 1;">
            <label for="lastname" style="display: block; margin-bottom: 5px; font-weight: bold;">Last Name:</label>
            <input type="text" id="lastname" name="lastname" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
        </div>
    </div>
    <div style="margin-bottom: 15px;">
        <label for="email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address:</label>
        <input type="email" id="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="phone" style="display: block; margin-bottom: 5px; font-weight: bold;">Phone Number:</label>
        <input type="tel" id="phone" name="phone" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="password" style="display: block; margin-bottom: 5px; font-weight: bold;">Password:</label>
        <input type="password" id="password" name="password" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="confirm_password" style="display: block; margin-bottom: 5px; font-weight: bold;">Confirm Password:</label>
        <input type="password" id="confirm_password" name="confirm_password" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center;">
            <input type="checkbox" name="terms" required style="margin-right: 8px;">
            I agree to the <a href="#" style="color: #007bff;">Terms and Conditions</a>
        </label>
    </div>
    <button type="submit" style="background-color: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Create Account</button>
</form>`;
                break;
                
            case 'search':
                formHtml = `<form action="${formAction}" method="${formMethod}" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
    <h3 style="margin-bottom: 20px; color: #333;">Search</h3>
    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
        <input type="search" name="q" placeholder="Enter your search term..." required style="flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
        <button type="submit" style="background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Search</button>
    </div>
    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Category:</label>
        <select name="category" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            <option value="">All Categories</option>
            <option value="products">Products</option>
            <option value="articles">Articles</option>
            <option value="services">Services</option>
        </select>
    </div>
</form>`;
                break;
                
            case 'feedback':
                formHtml = `<form action="${formAction}" method="${formMethod}" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
    <h3 style="margin-bottom: 20px; color: #333;">Feedback Form</h3>
    <div style="margin-bottom: 15px;">
        <label for="name" style="display: block; margin-bottom: 5px; font-weight: bold;">Your Name:</label>
        <input type="text" id="name" name="name" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address:</label>
        <input type="email" id="name" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Rating:</label>
        <div style="display: flex; gap: 10px;">
            <label style="display: flex; align-items: center;">
                <input type="radio" name="rating" value="5" style="margin-right: 5px;"> 5 Stars
            </label>
            <label style="display: flex; align-items: center;">
                <input type="radio" name="rating" value="4" style="margin-right: 5px;"> 4 Stars
            </label>
            <label style="display: flex; align-items: center;">
                <input type="radio" name="rating" value="3" style="margin-right: 5px;"> 3 Stars
            </label>
            <label style="display: flex; align-items: center;">
                <input type="radio" name="rating" value="2" style="margin-right: 5px;"> 2 Stars
            </label>
            <label style="display: flex; align-items: center;">
                <input type="radio" name="rating" value="1" style="margin-right: 5px;"> 1 Star
            </label>
        </div>
    </div>
    <div style="margin-bottom: 15px;">
        <label for="feedback" style="display: block; margin-bottom: 5px; font-weight: bold;">Your Feedback:</label>
        <textarea id="feedback" name="feedback" rows="4" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
    </div>
    <button type="submit" style="background-color: #ffc107; color: #333; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Submit Feedback</button>
</form>`;
                break;
                
            case 'order':
                formHtml = `<form action="${formAction}" method="${formMethod}" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
    <h3 style="margin-bottom: 20px; color: #333;">Order Form</h3>
    <div style="margin-bottom: 15px;">
        <label for="product" style="display: block; margin-bottom: 5px; font-weight: bold;">Product Name:</label>
        <input type="text" id="product" name="product" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="quantity" style="display: block; margin-bottom: 5px; font-weight: bold;">Quantity:</label>
        <input type="number" id="quantity" name="quantity" min="1" max="100" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="customer_name" style="display: block; margin-bottom: 5px; font-weight: bold;">Customer Name:</label>
        <input type="text" id="customer_name" name="customer_name" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email Address:</label>
        <input type="email" id="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="address" style="display: block; margin-bottom: 5px; font-weight: bold;">Shipping Address:</label>
        <textarea id="address" name="address" rows="3" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
    </div>
    <button type="submit" style="background-color: #dc3545; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Place Order</button>
</form>`;
                break;
                
            default:
                formHtml = `<form action="${formAction}" method="${formMethod}" style="margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
    <h3 style="margin-bottom: 20px; color: #333;">Contact Form</h3>
    <div style="margin-bottom: 15px;">
        <label for="name" style="display: block; margin-bottom: 5px; font-weight: bold;">Name:</label>
        <input type="text" id="name" name="name" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="email" style="display: block; margin-bottom: 5px; font-weight: bold;">Email:</label>
        <input type="email" id="email" name="email" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
    </div>
    <div style="margin-bottom: 15px;">
        <label for="message" style="display: block; margin-bottom: 5px; font-weight: bold;">Message:</label>
        <textarea id="message" name="message" rows="4" required style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
    </div>
    <button type="submit" style="background-color: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Submit</button>
</form>`;
        }
        
        actions.push({
            action: 'addBlock',
            file: htmlFile,
            parentSelector: 'body',
            htmlBlock: formHtml
        });
        
        console.log('Added form action:', { type: formType, action: formAction, method: formMethod });
    }
    
    // Add button commands (existing logic)
    if (lowerCommand.includes('add button') || lowerCommand.includes('create button')) {
        console.log('Add button command detected');
        let buttonText = 'Submit';
        let buttonType = 'submit';
        let buttonStyle = 'background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';
        
        // Extract button text
        const textMatch = lowerCommand.match(/(?:text|label)\s+(.+?)(?:\s+and|\s+with|$)/);
        if (textMatch) {
            buttonText = textMatch[1].trim();
        }
        
        // Extract button type
        if (lowerCommand.includes('reset button')) {
            buttonType = 'reset';
            buttonStyle = 'background-color: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;';
        } else if (lowerCommand.includes('button type')) {
            const typeMatch = lowerCommand.match(/type\s+(button|submit|reset)/);
            if (typeMatch) {
                buttonType = typeMatch[1];
            }
        }
        
        const htmlBlock = `<button type="${buttonType}" style="${buttonStyle}">${buttonText}</button>`;
        actions.push({
            action: 'addBlock',
            file: htmlFile,
            parentSelector: 'body',
            htmlBlock: htmlBlock
        });
        
        console.log('Added button action:', { text: buttonText, type: buttonType });
    }

    // Modify input field commands
    console.log('Checking for input modification commands...');
    console.log('Contains "change input":', lowerCommand.includes('change input'));
    console.log('Contains "modify input":', lowerCommand.includes('modify input'));
    console.log('Contains "update input":', lowerCommand.includes('update input'));
    console.log('Contains "set input":', lowerCommand.includes('set input'));
    
    if (lowerCommand.includes('change input') || lowerCommand.includes('modify input') || 
        lowerCommand.includes('update input') || lowerCommand.includes('set input') ||
        lowerCommand.includes('change field') || lowerCommand.includes('modify field') ||
        lowerCommand.includes('change textbox') || lowerCommand.includes('modify textbox') ||
        lowerCommand.includes('change label') || lowerCommand.includes('modify label')) {
        
        console.log('Input modification command detected');
        
        // Extract field identifier (name, id, or placeholder)
        let fieldIdentifier = '';
        let fieldType = 'name'; // name, id, placeholder, label
        
        // Look for field name
        const nameMatch = lowerCommand.match(/(?:field|input|textbox)\s+(?:name|called)\s+(.+?)(?:\s+and|\s+with|\s+to|$)/);
        if (nameMatch) {
            fieldIdentifier = nameMatch[1].trim();
            fieldType = 'name';
        }
        
        // Look for field id
        const idMatch = lowerCommand.match(/(?:field|input|textbox)\s+(?:id|with id)\s+(.+?)(?:\s+and|\s+with|\s+to|$)/);
        if (idMatch) {
            fieldIdentifier = idMatch[1].trim();
            fieldType = 'id';
        }
        
        // Look for placeholder
        const placeholderMatch = lowerCommand.match(/(?:field|input|textbox)\s+(?:placeholder|with placeholder)\s+(.+?)(?:\s+and|\s+with|\s+to|$)/);
        if (placeholderMatch) {
            fieldIdentifier = placeholderMatch[1].trim();
            fieldType = 'placeholder';
        }
        
        // Look for label text
        const labelMatch = lowerCommand.match(/(?:label|text)\s+(?:box|field|input)\s+(.+?)(?:\s+and|\s+with|\s+to|$)/);
        if (labelMatch) {
            fieldIdentifier = labelMatch[1].trim();
            fieldType = 'label';
        }
        
        // Look for "first name", "last name", etc.
        if (lowerCommand.includes('first name')) {
            fieldIdentifier = 'first name';
            fieldType = 'label';
        } else if (lowerCommand.includes('last name')) {
            fieldIdentifier = 'last name';
            fieldType = 'label';
        } else if (lowerCommand.includes('email')) {
            fieldIdentifier = 'email';
            fieldType = 'label';
        } else if (lowerCommand.includes('phone')) {
            fieldIdentifier = 'phone';
            fieldType = 'label';
        } else if (lowerCommand.includes('password')) {
            fieldIdentifier = 'password';
            fieldType = 'label';
        }
        
        console.log('Field identifier:', fieldIdentifier, 'Type:', fieldType);
        
        if (fieldIdentifier) {
            // Extract modifications
            let newPlaceholder = '';
            let newValue = '';
            let newType = '';
            let newRequired = null;
            let newDisabled = null;
            let newReadonly = null;
            let newMin = '';
            let newMax = '';
            let newStep = '';
            let newStyle = '';
            let newLabel = '';
            let newName = '';
            
            // Extract new label
            const newLabelMatch = lowerCommand.match(/(?:to|set|change)\s+(?:label|text)\s+(.+?)(?:\s+and|\s+with|$)/);
            if (newLabelMatch) {
                newLabel = newLabelMatch[1].trim();
            }
            
            // Extract new name
            const newNameMatch = lowerCommand.match(/(?:to|set|change)\s+(?:name)\s+(.+?)(?:\s+and|\s+with|$)/);
            if (newNameMatch) {
                newName = newNameMatch[1].trim();
            }
            
            // Extract new placeholder
            const newPlaceholderMatch = lowerCommand.match(/(?:to|set|change)\s+(?:placeholder|text)\s+(.+?)(?:\s+and|\s+with|$)/);
            if (newPlaceholderMatch) {
                newPlaceholder = newPlaceholderMatch[1].trim();
            }
            
            // Extract new value
            const newValueMatch = lowerCommand.match(/(?:to|set|change)\s+(?:value|default)\s+(.+?)(?:\s+and|\s+with|$)/);
            if (newValueMatch) {
                newValue = newValueMatch[1].trim();
            }
            
            // Extract new type
            const newTypeMatch = lowerCommand.match(/(?:to|set|change)\s+(?:type)\s+(text|email|password|number|textarea|date|time|datetime-local|url|tel|file|checkbox|radio|range|color|search)(?:\s+and|\s+with|$)/);
            if (newTypeMatch) {
                newType = newTypeMatch[1].trim();
            }
            
            // Extract required status
            if (lowerCommand.includes('make required') || lowerCommand.includes('set required')) {
                newRequired = true;
            } else if (lowerCommand.includes('remove required') || lowerCommand.includes('not required')) {
                newRequired = false;
            }
            
            // Extract disabled status
            if (lowerCommand.includes('disable') || lowerCommand.includes('make disabled')) {
                newDisabled = true;
            } else if (lowerCommand.includes('enable') || lowerCommand.includes('make enabled')) {
                newDisabled = false;
            }
            
            // Extract readonly status
            if (lowerCommand.includes('readonly') || lowerCommand.includes('read only')) {
                newReadonly = true;
            }
            
            // Extract min/max/step for number/range inputs
            const minMatch = lowerCommand.match(/(?:min|minimum)\s+(\d+)/);
            if (minMatch) {
                newMin = minMatch[1];
            }
            
            const maxMatch = lowerCommand.match(/(?:max|maximum)\s+(\d+)/);
            if (maxMatch) {
                newMax = maxMatch[1];
            }
            
            const stepMatch = lowerCommand.match(/step\s+(\d+)/);
            if (stepMatch) {
                newStep = stepMatch[1];
            }
            
            // Extract style changes
            if (lowerCommand.includes('red background') || lowerCommand.includes('background red')) {
                newStyle = 'background-color: red;';
            } else if (lowerCommand.includes('blue background') || lowerCommand.includes('background blue')) {
                newStyle = 'background-color: blue;';
            } else if (lowerCommand.includes('green background') || lowerCommand.includes('background green')) {
                newStyle = 'background-color: green;';
            } else if (lowerCommand.includes('yellow background') || lowerCommand.includes('background yellow')) {
                newStyle = 'background-color: yellow;';
            }
            
            // Build selector based on field type
            let selector = '';
            if (fieldType === 'name') {
                selector = `input[name="${fieldIdentifier}"], textarea[name="${fieldIdentifier}"]`;
            } else if (fieldType === 'id') {
                selector = `#${fieldIdentifier}`;
            } else if (fieldType === 'placeholder') {
                selector = `input[placeholder*="${fieldIdentifier}"], textarea[placeholder*="${fieldIdentifier}"]`;
            } else if (fieldType === 'label') {
                // For labels, we need to find the associated input
                selector = `input[name*="${fieldIdentifier}"], input[id*="${fieldIdentifier}"], textarea[name*="${fieldIdentifier}"]`;
            }
            
            console.log('Built selector:', selector);
            console.log('Modifications:', { 
                label: newLabel, 
                name: newName,
                placeholder: newPlaceholder, 
                value: newValue, 
                type: newType, 
                required: newRequired,
                disabled: newDisabled,
                readonly: newReadonly,
                min: newMin,
                max: newMax,
                step: newStep,
                style: newStyle
            });
            
            // Add modification actions
            if (newLabel) {
                actions.push({
                    action: 'modifyAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'name',
                    value: newLabel.replace(/\s+/g, '_').toLowerCase()
                });
            }
            
            if (newName) {
                actions.push({
                    action: 'modifyAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'name',
                    value: newName
                });
            }
            
            if (newPlaceholder) {
                actions.push({
                    action: 'modifyAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'placeholder',
                    value: newPlaceholder
                });
            }
            
            if (newValue) {
                actions.push({
                    action: 'modifyAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'value',
                    value: newValue
                });
            }
            
            if (newType) {
                actions.push({
                    action: 'modifyAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'type',
                    value: newType
                });
            }
            
            if (newRequired !== null) {
                if (newRequired) {
                    actions.push({
                        action: 'addAttribute',
                        file: htmlFile,
                        selector: selector,
                        attribute: 'required',
                        value: ''
                    });
                } else {
                    actions.push({
                        action: 'removeAttribute',
                        file: htmlFile,
                        selector: selector,
                        attribute: 'required'
                    });
                }
            }
            
            if (newDisabled !== null) {
                if (newDisabled) {
                    actions.push({
                        action: 'addAttribute',
                        file: htmlFile,
                        selector: selector,
                        attribute: 'disabled',
                        value: ''
                    });
                } else {
                    actions.push({
                        action: 'removeAttribute',
                        file: htmlFile,
                        selector: selector,
                        attribute: 'disabled'
                    });
                }
            }
            
            if (newReadonly) {
                actions.push({
                    action: 'addAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'readonly',
                    value: ''
                });
            }
            
            if (newMin) {
                actions.push({
                    action: 'modifyAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'min',
                    value: newMin
                });
            }
            
            if (newMax) {
                actions.push({
                    action: 'modifyAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'max',
                    value: newMax
                });
            }
            
            if (newStep) {
                actions.push({
                    action: 'modifyAttribute',
                    file: htmlFile,
                    selector: selector,
                    attribute: 'step',
                    value: newStep
                });
            }
            
            if (newStyle) {
                actions.push({
                    action: 'modifyStyle',
                    file: htmlFile,
                    selector: selector,
                    style: newStyle
                });
            }
            
            console.log('Added input modification actions:', actions.length);
        } else {
            console.log('No field identifier found in command');
        }
    }
    
    console.log('Simple command interpreter actions:', actions);
    
    // Check for advanced commands if no basic commands were found
    if (actions.length === 0) {
        const advancedActions = interpretAdvancedCommands(siteIndex, userCommand);
        if (advancedActions.length > 0) {
            console.log('Advanced commands found:', advancedActions.length);
            return advancedActions;
        }
    }
    
    return actions;
}

// App Features Section - UI, Settings, and User Experience
function interpretAdvancedCommands(siteIndex, userCommand) {
    const lowerCommand = userCommand.toLowerCase();
    const actions = [];
    
    console.log('Checking for app features...');
    
    // Theme Management
    if (lowerCommand.includes('change theme') || lowerCommand.includes('set theme') || 
        lowerCommand.includes('switch theme') || lowerCommand.includes('apply theme')) {
        console.log('Theme change command detected');
        
        let themeName = 'default';
        if (lowerCommand.includes('dark theme') || lowerCommand.includes('dark mode')) {
            themeName = 'dark';
        } else if (lowerCommand.includes('light theme') || lowerCommand.includes('light mode')) {
            themeName = 'light';
        } else if (lowerCommand.includes('blue theme')) {
            themeName = 'blue';
        } else if (lowerCommand.includes('green theme')) {
            themeName = 'green';
        } else if (lowerCommand.includes('purple theme')) {
            themeName = 'purple';
        }
        
        actions.push({
            action: 'changeTheme',
            theme: themeName
        });
        
        console.log('Added theme change action:', { theme: themeName });
    }
    
    // Font Size Management
    if (lowerCommand.includes('change font size') || lowerCommand.includes('set font size') || 
        lowerCommand.includes('increase font') || lowerCommand.includes('decrease font')) {
        console.log('Font size command detected');
        
        let fontSize = 'medium';
        if (lowerCommand.includes('large') || lowerCommand.includes('big')) {
            fontSize = 'large';
        } else if (lowerCommand.includes('small') || lowerCommand.includes('tiny')) {
            fontSize = 'small';
        } else if (lowerCommand.includes('medium') || lowerCommand.includes('normal')) {
            fontSize = 'medium';
        }
        
        actions.push({
            action: 'changeFontSize',
            size: fontSize
        });
        
        console.log('Added font size change action:', { size: fontSize });
    }
    
    // Language Settings
    if (lowerCommand.includes('change language') || lowerCommand.includes('set language') || 
        lowerCommand.includes('switch language')) {
        console.log('Language change command detected');
        
        let language = 'english';
        if (lowerCommand.includes('spanish')) {
            language = 'spanish';
        } else if (lowerCommand.includes('french')) {
            language = 'french';
        } else if (lowerCommand.includes('german')) {
            language = 'german';
        } else if (lowerCommand.includes('chinese')) {
            language = 'chinese';
        }
        
        actions.push({
            action: 'changeLanguage',
            language: language
        });
        
        console.log('Added language change action:', { language: language });
    }
    
    // Auto-save Settings
    if (lowerCommand.includes('auto save') || lowerCommand.includes('autosave') || 
        lowerCommand.includes('auto backup')) {
        console.log('Auto-save command detected');
        
        let autoSave = true;
        if (lowerCommand.includes('disable') || lowerCommand.includes('off') || lowerCommand.includes('stop')) {
            autoSave = false;
        }
        
        actions.push({
            action: 'setAutoSave',
            enabled: autoSave
        });
        
        console.log('Added auto-save setting action:', { enabled: autoSave });
    }
    
    // Keyboard Shortcuts
    if (lowerCommand.includes('shortcuts') || lowerCommand.includes('keyboard shortcuts') || 
        lowerCommand.includes('hotkeys')) {
        console.log('Shortcuts command detected');
        
        actions.push({
            action: 'showShortcuts'
        });
        
        console.log('Added show shortcuts action');
    }
    
    // File History
    if (lowerCommand.includes('file history') || lowerCommand.includes('recent files') || 
        lowerCommand.includes('open recent')) {
        console.log('File history command detected');
        
        actions.push({
            action: 'showFileHistory'
        });
        
        console.log('Added show file history action');
    }
    
    // Export/Import Settings
    if (lowerCommand.includes('export settings') || lowerCommand.includes('backup settings')) {
        console.log('Export settings command detected');
        
        actions.push({
            action: 'exportSettings'
        });
        
        console.log('Added export settings action');
    }
    
    if (lowerCommand.includes('import settings') || lowerCommand.includes('restore settings')) {
        console.log('Import settings command detected');
        
        actions.push({
            action: 'importSettings'
        });
        
        console.log('Added import settings action');
    }
    
    // Notification Settings
    if (lowerCommand.includes('notifications') || lowerCommand.includes('alerts')) {
        console.log('Notification settings command detected');
        
        let notifications = true;
        if (lowerCommand.includes('disable') || lowerCommand.includes('off') || lowerCommand.includes('mute')) {
            notifications = false;
        }
        
        actions.push({
            action: 'setNotifications',
            enabled: notifications
        });
        
        console.log('Added notification setting action:', { enabled: notifications });
    }
    
    // Fullscreen Mode
    if (lowerCommand.includes('fullscreen') || lowerCommand.includes('full screen')) {
        console.log('Fullscreen command detected');
        
        let fullscreen = true;
        if (lowerCommand.includes('exit') || lowerCommand.includes('close') || lowerCommand.includes('off')) {
            fullscreen = false;
        }
        
        actions.push({
            action: 'setFullscreen',
            enabled: fullscreen
        });
        
        console.log('Added fullscreen action:', { enabled: fullscreen });
    }
    
    // Help and Documentation
    if (lowerCommand.includes('help') || lowerCommand.includes('documentation') || 
        lowerCommand.includes('tutorial') || lowerCommand.includes('guide')) {
        console.log('Help command detected');
        
        actions.push({
            action: 'showHelp'
        });
        
        console.log('Added show help action');
    }
    
    // About/Info
    if (lowerCommand.includes('about') || lowerCommand.includes('info') || 
        lowerCommand.includes('version')) {
        console.log('About command detected');
        
        actions.push({
            action: 'showAbout'
        });
        
        console.log('Added show about action');
    }
    
    // Reset Settings
    if (lowerCommand.includes('reset settings') || lowerCommand.includes('factory reset') || 
        lowerCommand.includes('default settings')) {
        console.log('Reset settings command detected');
        
        actions.push({
            action: 'resetSettings'
        });
        
        console.log('Added reset settings action');
    }
    
    return actions;
}

module.exports = { interpretCommand };
