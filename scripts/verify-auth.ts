
import axios from 'axios';

const API_URL = 'https://cloudflare-workers-openapi-production.up.railway.app';

async function verifyAuth() {
  console.log('🔐 Starting Auth Verification...');
  const email = `test.auth.${Date.now()}@example.com`;
  const password = 'password123';
  const name = 'Auth Tester';

  try {
    // 1. Signup
    console.log(`\n[1/3] Signing up as ${email}...`);
    const signupRes = await axios.post(`${API_URL}/auth/signup`, {
      name,
      email,
      password,
    }, { timeout: 10000 });
    console.log('✅ Signup Successful:', signupRes.data);

    // 2. Login
    console.log('\n[2/3] Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/signin`, {
      email,
      password,
    });
    const { accessToken, user } = loginRes.data;
    if (!accessToken) throw new Error('No access token returned');
    console.log('✅ Login Successful. Token received.');
    console.log('   User:', user);

    // 3. Verify Token (if there's a protected route, e.g., Profile or Check)
    // Assuming GET /auth/profile or /users/me exists, or just checking if token is valid via any protected route
    // Let's try to fetch drafts for this user (should be empty but accessible)
    console.log('\n[3/3] Testing Protected Route (Get Drafts)...');
    const draftsRes = await axios.get(`${API_URL}/icons/drafts/${user.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('✅ Protected Route Access Successful. Drafts:', draftsRes.data);

  } catch (error: any) {
    if (error.response) {
      console.error('❌ Auth Failed (Response):', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ Auth Failed (No Response):', error.request);
    } else {
      console.error('❌ Auth Failed (Message):', error.message);
    }
    console.error('Full Error:', error);
  }
}

verifyAuth();
