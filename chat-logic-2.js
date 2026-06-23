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
        msgDiv.innerHTML += `<p><b>${currentName}:</b> ${msg.text}</p>`;
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
            
            msgDiv.innerHTML += `<p><b>${currentName}:</b> ${payload.new.text}</p>`;
            msgDiv.scrollTop = msgDiv.scrollHeight;
        })
        .subscribe();
}
