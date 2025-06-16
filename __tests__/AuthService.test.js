// __tests__/AuthService.test.js  
import { AuthService } from '../src/services/AuthService';

// Mock Supabase
jest.mock('../src/utils/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    }
  },
  refreshSession: jest.fn(),
  getAuthenticatedUser: jest.fn(),
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
}));

describe('AuthService', () => {
  let authService;
  let mockSupabase;
  let mockUtils;

  beforeEach(() => {
    authService = new AuthService();
    mockSupabase = require('../src/utils/supabase').supabase;
    mockUtils = require('../src/utils/supabase');
    jest.clearAllMocks();
  });

  describe('isAuthenticated', () => {
    it('should return true when session exists and user is valid', async () => {
      mockUtils.refreshSession.mockResolvedValue(true);
      
      const result = await authService.isAuthenticated();
      
      expect(result).toBe(true);
    });

    it('should check session when refresh is not needed', async () => {
      mockUtils.refreshSession.mockResolvedValue(false);
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: '123' } } }
      });
      mockUtils.getAuthenticatedUser.mockResolvedValue({ id: '123' });

      const result = await authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no session', async () => {
      mockUtils.refreshSession.mockResolvedValue(false);
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockUtils.refreshSession.mockRejectedValue(new Error('Network error'));

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should sign in successfully with valid credentials', async () => {
      const mockData = {
        session: { 
          user: { id: '123' },
          expires_at: Date.now() + 3600000 
        }
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await authService.signIn('test@example.com', 'password');

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
      expect(result).toEqual(mockData);
    });

    it('should throw error when credentials are invalid', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' }
      });

      await expect(authService.signIn('wrong@email.com', 'wrong'))
        .rejects.toMatchObject({ message: 'Invalid credentials' });
    });

    it('should throw error when no session is returned', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: null
      });

      await expect(authService.signIn('test@example.com', 'password'))
        .rejects.toThrow('Authentication failed: No session returned');
    });
  });
});
