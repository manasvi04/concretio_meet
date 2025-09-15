/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface RoomInfo {
  id: string;
  name: string;
  api_created: boolean;
  privacy: 'private' | 'public';
  url: string;
  created_at: string;
  config: Record<string, any>;
}

export interface RoomListItem extends RoomInfo {}

/**
 * Extract room name from various input formats
 */
export function extractRoomName(input: string): string {
  if (!input) return '';
  
  let cleanInput = input.trim();
  
  // Remove protocol
  cleanInput = cleanInput.replace(/^https?:\/\//, '');
  
  // Remove daily.co domain and path
  cleanInput = cleanInput.replace(/^[^\/]+\.daily\.co\//, '');
  cleanInput = cleanInput.replace(/^[^\/]+\//, '');
  
  // Remove any trailing slashes or query parameters
  cleanInput = cleanInput.split('?')[0].split('#')[0].replace(/\/$/, '');
  
  return cleanInput;
}

/**
 * Create a full Daily.co room URL from room name
 */
export function createRoomUrl(roomName: string): string {
  const cleanName = extractRoomName(roomName);
  return `https://concretio.daily.co/${cleanName}`;
}

/**
 * Validate room name format
 */
export function isValidRoomName(roomName: string): boolean {
  if (!roomName || roomName.trim().length === 0) return false;
  
  const cleanName = extractRoomName(roomName);
  
  if (cleanName.length < 1 || cleanName.length > 100) return false;
  
  const roomNameRegex = /^[a-zA-Z0-9-_]+$/;
  return roomNameRegex.test(cleanName);
}

/**
 * Get Daily.co API key from environment variables
 */
function getDailyApiKey(): string {
  const apiKey = import.meta.env.VITE_DAILY_API_KEY;
  if (!apiKey) {
    throw new Error('Daily.co API key not found. Please set VITE_DAILY_API_KEY in your environment variables.');
  }
  return apiKey;
}

/**
 * Verify if a Daily.co room exists using the Daily.co REST API
 */
export async function verifyRoomExists(roomUrlOrName: string): Promise<{
  exists: boolean;
  roomInfo?: RoomInfo;
  error?: string;
}> {
  try {
    const roomName = extractRoomName(roomUrlOrName);
    
    if (!roomName) {
      return {
        exists: false,
        error: 'Invalid room name or URL'
      };
    }

    // Validate room name format first
    if (!isValidRoomName(roomName)) {
      return {
        exists: false,
        error: 'Invalid room name format. Room names can only contain letters, numbers, hyphens, and underscores.'
      };
    }

    try {
      const apiKey = getDailyApiKey();
      const encodedName = encodeURIComponent(roomName);
      
      // Use Daily.co REST API to check if room exists
      const response = await fetch(`https://api.daily.co/v1/rooms/${encodedName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Room exists - get the room information
        const roomData = await response.json();
        return {
          exists: true,
          roomInfo: {
            id: roomData.id || roomName,
            name: roomData.name || roomName,
            api_created: roomData.api_created || false,
            privacy: roomData.privacy || 'public',
            url: roomData.url || createRoomUrl(roomName),
            created_at: roomData.created_at || new Date().toISOString(),
            // Daily returns room configuration under 'properties'
            config: roomData.properties || {}
          }
        };
      } else if (response.status === 404) {
        // Room doesn't exist
        return {
          exists: false,
          error: 'Room not found. Please check the room name and try again.'
        };
      } else if (response.status === 401) {
        // API key issue
        return {
          exists: false,
          error: 'Authentication failed. Please check your API configuration.'
        };
      } else if (response.status === 403) {
        // Permission issue
        return {
          exists: false,
          error: 'Access denied. You may not have permission to access this room.'
        };
      } else {
        // Other API errors
        const errorData = await response.json().catch(() => ({}));
        return {
          exists: false,
          error: errorData.error || `API request failed with status ${response.status}`
        };
      }
    } catch (apiError) {
      console.error('Daily.co API request failed:', apiError);
      
      return {
        exists: false,
        error: 'Unable to verify room existence. Please check your connection and try again.'
      };
    }

  } catch (error) {
    console.error('Room verification failed:', error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Failed to verify room'
    };
  }
}

/**
 * List Daily.co rooms. Optionally supports pagination params if needed later.
 */
export async function listRooms(): Promise<{
  success: boolean;
  rooms?: RoomListItem[];
  error?: string;
}> {
  try {
    const apiKey = getDailyApiKey();
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      // Daily returns { total_count, data: [ ...rooms ] }
      const rooms = (data.data || []).map((room: any) => ({
        id: room.id,
        name: room.name,
        api_created: room.api_created,
        privacy: room.privacy,
        url: room.url || createRoomUrl(room.name),
        created_at: room.created_at,
        config: room.properties || room.config || {}
      })) as RoomListItem[];

      return { success: true, rooms };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `Failed to list rooms: ${response.status}` };
    }
  } catch (error) {
    console.error('List rooms failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to list rooms' };
  }
}

/**
 * Create a new Daily.co room using the API
 */
export async function createRoom(roomName: string, options?: {
  privacy?: 'private' | 'public';
  properties?: {
    max_participants?: number;
    enable_chat?: boolean;
    enable_knocking?: boolean;
    enable_screenshare?: boolean;
    enable_recording?: 'cloud' | 'local';
    enable_advanced_chat?: boolean;
    enable_video_processing_ui?: boolean;
    enable_live_captions_ui?: boolean;
    enable_network_ui?: boolean;
    nbf?: number;
  };
}): Promise<{
  success: boolean;
  roomInfo?: RoomInfo;
  error?: string;
}> {
  try {
    const apiKey = getDailyApiKey();
    
    const requestBody = {
      name: roomName,
      privacy: options?.privacy || 'public',
      properties: options?.properties || {}
    };

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      const roomData = await response.json();
      return {
        success: true,
        roomInfo: {
          id: roomData.id,
          name: roomData.name,
          api_created: roomData.api_created,
          privacy: roomData.privacy,
          url: roomData.url,
          created_at: roomData.created_at,
          config: roomData.properties || roomData.config || {}
        }
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to create room: ${response.status}`
      };
    }
  } catch (error) {
    console.error('Room creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room'
    };
  }
}

/**
 * Update an existing Daily.co room (e.g., reschedule by updating properties.nbf)
 */
export async function updateRoom(
  roomName: string,
  options?: {
    privacy?: 'private' | 'public';
    properties?: {
      max_participants?: number;
      enable_chat?: boolean;
      enable_knocking?: boolean;
      enable_screenshare?: boolean;
      enable_recording?: 'cloud' | 'local';
      enable_advanced_chat?: boolean;
      enable_video_processing_ui?: boolean;
      enable_live_captions_ui?: boolean;
      enable_network_ui?: boolean;
      nbf?: number;
    };
  }
): Promise<{
  success: boolean;
  roomInfo?: RoomInfo;
  error?: string;
}> {
  try {
    const apiKey = getDailyApiKey();

    const requestBody: Record<string, any> = {};
    if (options?.privacy) requestBody.privacy = options.privacy;
    if (options?.properties) requestBody.properties = options.properties;

    const response = await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(extractRoomName(roomName))}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      const roomData = await response.json();
      return {
        success: true,
        roomInfo: {
          id: roomData.id || roomName,
          name: roomData.name || roomName,
          api_created: roomData.api_created || false,
          privacy: roomData.privacy || 'public',
          url: roomData.url || createRoomUrl(extractRoomName(roomName)),
          created_at: roomData.created_at || new Date().toISOString(),
          config: roomData.properties || roomData.config || {}
        }
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to update room: ${response.status}`
      };
    }
  } catch (error) {
    console.error('Room update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update room'
    };
  }
}

/**
 * Delete a Daily.co room using the API
 */
export async function deleteRoom(roomName: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const apiKey = getDailyApiKey();
    
    const response = await fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(extractRoomName(roomName))}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to delete room: ${response.status}`
      };
    }
  } catch (error) {
    console.error('Room deletion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete room'
    };
  }
}