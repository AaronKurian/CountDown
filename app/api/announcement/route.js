let announcements = [];

export async function GET() {
  return Response.json({ announcements });
}

export async function POST(request) {
  const data = await request.json();
  
  if (data.action === 'add' && data.text) {
    // Add a new announcement with a unique ID
    const newAnnouncement = {
      id: Date.now().toString(), // Simple unique ID
      text: data.text,
      timestamp: new Date().toISOString()
    };
    announcements.push(newAnnouncement);
  } 
  else if (data.action === 'remove' && data.id) {
    // Remove a specific announcement by ID
    announcements = announcements.filter(a => a.id !== data.id);
  }
  else if (data.action === 'clear') {
    // Clear all announcements
    announcements = [];
  }
  
  return Response.json({ success: true, announcements });
} 