// NEW FUNCTION: Fetch existing messages from Supabase and display them
async function loadPastMessages() {
    if (!document.getElementById('messages')) return;

    // Get the last 50 messages from the database, ordered by creation time
    const { data, error } = await supabaseClient
        .from('messages')
        .select('name, text')
        .order('created_at', { ascending: true })
        .limit(50);

    if (error) {
        console.error('Error loading past messages:', error);
        return;
    }

    // Loop through the messages and append them to the chat box
    const msgDiv = document.getElementById('messages');
    data.forEach(msg => {
        const currentName = msg.name || "Anonymous";
        
        // Render either an image element or a text string
        if (msg.text && msg.text.startsWith('[IMAGE_URL]:')) {
            const imageUrl = msg.text.replace('[IMAGE_URL]:', '');
            msgDiv.innerHTML += `<p><b>${currentName}:</b><br><img src="${imageUrl}" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 5px; display: block;"></p>`;
        } else {
            msgDiv.innerHTML += `<p><b>${currentName}:</b> ${msg.text}</p>`;
        }
    });

    // Automatically scroll to the bottom of the chat log
    msgDiv.scrollTop = msgDiv.scrollHeight;
}

// Function to send a message to Supabase
async function sendMessage() {
    const input = document.getElementById('msgInput');
    if (!input || !input.value.trim()) return;

    await supabaseClient.from('messages').insert([
        { text: input.value, name: userName }
    ]);
    
    input.value = '';
}

// Function to listen for new messages in real-time
function startChatListening() {
    if (!document.getElementById('messages')) return;

    supabaseClient
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const msgDiv = document.getElementById('messages');
            const currentName = payload.new.name || "Anonymous";
            const currentText = payload.new.text || "";

            // Render either an image element or a text string in real-time
            if (currentText.startsWith('[IMAGE_URL]:')) {
                const imageUrl = currentText.replace('[IMAGE_URL]:', '');
                msgDiv.innerHTML += `<p><b>${currentName}:</b><br><img src="${imageUrl}" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 5px; display: block;"></p>`;
            } else {
                msgDiv.innerHTML += `<p><b>${currentName}:</b> ${currentText}</p>`;
            }

            msgDiv.scrollTop = msgDiv.scrollHeight;
        })
        .subscribe();
}

// NEW FUNCTION: Handle file picking, uploading to Storage, and database insertion
async function uploadAndSendFile() {
    const fileInput = document.getElementById('fileInput');
    
    // Safety check: Make sure a file is actually chosen
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
    
    // FIX: Target the first file object explicitly instead of the entire list array
    const file = fileInput.files[0]; 
    const msgDiv = document.getElementById('messages');

    // 1. Inject a temporary loading element into the chat view
    const loadingId = 'loading-' + Date.now();
    msgDiv.innerHTML += `<p id="${loadingId}" style="color: #888; font-style: italic;"><b>${userName}:</b> 🔄 Uploading image...</p>`;
    msgDiv.scrollTop = msgDiv.scrollHeight;

    // 2. Generate a unique name for the image target to prevent duplicate naming bugs
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

    // 3. Send binary file data to your public 'chat-images' bucket
    const { data, error: uploadError } = await supabaseClient.storage
        .from('chat-images')
        .upload(uniqueFileName, file);

    if (uploadError) {
        console.error('Upload failed details:', uploadError.message);
        alert('Failed to upload image: ' + uploadError.message);
        
        // Remove the loading indicator text if the upload fails
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        fileInput.value = '';
        return;
    }

    // 4. Extract public image link
    const { data: urlData } = supabaseClient.storage
        .from('chat-images')
        .getPublicUrl(uniqueFileName);

    const publicUrl = urlData.publicUrl;

    // 5. Store image URL link inside your regular messages table
    await supabaseClient.from('messages').insert([
        { text: `[IMAGE_URL]:${publicUrl}`, name: userName }
    ]);

    // 6. Clean up the loader and reset file field for the next image
    const loader = document.getElementById(loadingId);
    if (loader) loader.remove();
    fileInput.value = '';
}

// Optional Quality of Life: Listen for pressing "Enter" on text field
document.getElementById('msgInput')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
