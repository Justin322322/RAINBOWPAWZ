import { cookies } from 'next/headers';
import { query } from './db';

interface Session {
  userId: string;
  accountType: string;
  isAdmin: boolean;
}

export async function getServerSession(): Promise<Session | null> {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth_token');

    if (!authToken || !authToken.value) {
      return null;
    }

    // Parse the auth token (format: userId_accountType)
    const [userId, accountType] = authToken.value.split('_');

    if (!userId || !accountType) {
      return null;
    }

    // Check if the user exists in the database
    const users = await query(
      'SELECT id, account_type FROM users WHERE id = ?',
      [userId]
    );

    if (!users || users.length === 0) {
      return null;
    }

    // Check if the account type matches
    if (users[0].account_type !== accountType) {
      return null;
    }

    return {
      userId,
      accountType,
      isAdmin: accountType === 'admin'
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}
