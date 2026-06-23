// Function to send a message to Supabase
async function sendMessage() {
    const input = document.getElementById('msgInput');
    if (!input || !input.value.trim()) return;

    // We now send both the text AND the user's name to the database
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
            
            // We now grab payload.new.name instead of hardcoding "User"
            const currentName = payload.new.name || "Anonymous";
            
            msgDiv.innerHTML += `<p><b>${currentName}:</b> ${payload.new.text}</p>`;
            msgDiv.scrollTop = msgDiv.scrollHeight;
        })
        .subscribe();
}
