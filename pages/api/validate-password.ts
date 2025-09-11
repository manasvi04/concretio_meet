// Simple password validation endpoint for Vite
export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Get the password from environment variable
  const correctPassword = process.env.VITE_CREATE_ROOM_PASSWORD;

  if (!correctPassword) {
    console.error('VITE_CREATE_ROOM_PASSWORD environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Validate the password
  if (password === correctPassword) {
    return res.status(200).json({ valid: true });
  } else {
    return res.status(401).json({ error: 'Invalid password' });
  }
}
