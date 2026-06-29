import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

let announcements = [];

export async function GET() {
  return Response.json({ announcements });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.json();
  
  if (data.action === 'add' && data.text) {
    const newAnnouncement = {
      id: Date.now().toString(),
      text: String(data.text).trim().slice(0, 240),
      timestamp: new Date().toISOString()
    };
    announcements.push(newAnnouncement);
  } 
  else if (data.action === 'remove' && data.id) {
    announcements = announcements.filter(a => a.id !== data.id);
  }
  else if (data.action === 'clear') {
    announcements = [];
  }
  
  return Response.json({ success: true, announcements });
} 
