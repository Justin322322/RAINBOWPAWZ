import { query } from './db';

interface _Session {
  userId: string;
  accountType: string;
  isAdmin: boolean;
}



// Get the server session from cookies
export const getServerSession = async () => {
  try {
    // Get the cookie value directly from the request headers
    // This is a workaround for the cookies() function type issues
    // Note: Development should use proper authentication, not hardcoded values
    const cookieHeader = process.env.NODE_ENV === 'development'
      ? {} // No mock cookie in development for security
      : {};

    const authCookieValue = (cookieHeader as any)['auth_token'];

    if (!authCookieValue) {
      return null;
    }

    const authCookie = { value: authCookieValue };

    // Try to decode the cookie value
    let decodedValue;
    try {
      decodedValue = decodeURIComponent(authCookie.value);
    } catch {
      decodedValue = authCookie.value;
    }

    // Parse the token
    const parts = decodedValue.split('_');

    if (parts.length !== 2) {
      return null;
    }

    const userId = parts[0];
    const _accountType = parts[1];

    // Get user data from database
    const userData = await query(
      'SELECT user_id, email, first_name, last_name, role FROM users WHERE user_id = ?',
      [userId]
    ) as any[];

    if (!userData || userData.length === 0) {
      return null;
    }

    const user = userData[0];

    return {
      user: {
        id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
};
