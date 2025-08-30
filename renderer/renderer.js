document.getElementById('run').onclick = async () => {
    const folder = document.getElementById('folder').value;
    const command = document.getElementById('command').value;
    
    if (!folder || !command) {
        showResult('Please select a folder/file and enter a command.', 'error');
        return;
    }
    
    // Show processing state
    const runButton = document.getElementById('run');
    const originalText = runButton.innerHTML;
    runButton.innerHTML = '<span class="icon">⏳</span> Processing...';
    runButton.disabled = true;
    
    try {
        const res = await window.electronAPI.runCommand(folder, command);
        
        if (res.success) {
            const resultText = formatResult(res.data);
            showResult(resultText, 'success');
        } else {
            showResult('Error: ' + res.error, 'error');
        }
    } catch (error) {
        showResult('Error: ' + error.message, 'error');
    } finally {
        // Restore button state
        runButton.innerHTML = originalText;
        runButton.disabled = false;
    }
};

function showResult(message, type) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = message;
    
    // Remove existing status classes
    resultDiv.className = '';
    
    // Add status-specific styling
    if (type === 'success') {
        resultDiv.classList.add('status', 'success');
    } else if (type === 'error') {
        resultDiv.classList.add('status', 'error');
    } else if (type === 'processing') {
        resultDiv.classList.add('status', 'processing');
    }
}

function formatResult(result) {
    if (!result.results || result.results.length === 0) {
        return 'Command completed successfully, but no changes were made.';
    }
    
    let formatted = '✅ Command executed successfully!\n\n';
    
    result.results.forEach((action, index) => {
        formatted += `📝 Action ${index + 1}:\n`;
        formatted += `   • Type: ${action.action}\n`;
        formatted += `   • File: ${action.file.split('\\').pop()}\n`;
        
        if (action.selector) {
            formatted += `   • Target: ${action.selector}\n`;
        }
        
        if (action.status === 'modified') {
            formatted += `   • Status: ✅ Modified successfully\n`;
        } else if (action.status === 'no_change') {
            formatted += `   • Status: ℹ️ No changes needed\n`;
        } else if (action.status === 'error') {
            formatted += `   • Status: ❌ Error: ${action.error}\n`;
        }
        
        if (action.message) {
            formatted += `   • Details: ${action.message}\n`;
        }
        
        formatted += '\n';
    });
    
    return formatted;
}

document.getElementById('browse').onclick = async () => {
    const folder = await window.electronAPI.pickFolder();
    if (folder) {
        document.getElementById('folder').value = folder;
    }
};

document.getElementById('browse-html').onclick = async () => {
    const htmlFile = await window.electronAPI.pickHtmlFile();
    if (htmlFile) {
        document.getElementById('folder').value = htmlFile;
    }
};