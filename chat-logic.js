// Function to send a message to Supabase
async function sendMessage() {
    const input = document.getElementById('msgInput');
    if (!input.value.trim()) return;

    await supabaseClient.from('messages').insert([{ text: input.value }]);
    input.value = '';
}

// Function to listen for new messages in real-time
function startChatListening() {
    supabaseClient
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const msgDiv = document.getElementById('messages');
            msgDiv.innerHTML += `<p><b>User:</b> ${payload.new.text}</p>`;
            msgDiv.scrollTop = msgDiv.scrollHeight;
        })
        .subscribe();
}
