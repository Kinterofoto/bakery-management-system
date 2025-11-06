// Test script para verificar autenticación de Outlook
require('dotenv').config();
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');

async function testOutlook() {
  console.log('🔍 Testing Outlook API credentials...\n');
  
  console.log('Environment variables:');
  console.log('OUTLOOK_TENANT_ID:', process.env.OUTLOOK_TENANT_ID ? '✅ Set' : '❌ Missing');
  console.log('OUTLOOK_CLIENT_ID:', process.env.OUTLOOK_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('OUTLOOK_CLIENT_SECRET:', process.env.OUTLOOK_CLIENT_SECRET ? '✅ Set (length: ' + process.env.OUTLOOK_CLIENT_SECRET.length + ')' : '❌ Missing');
  console.log('OUTLOOK_USER_EMAIL:', process.env.OUTLOOK_USER_EMAIL || '❌ Missing');
  console.log('\n');

  if (!process.env.OUTLOOK_TENANT_ID || !process.env.OUTLOOK_CLIENT_ID || !process.env.OUTLOOK_CLIENT_SECRET) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  try {
    console.log('🔐 Attempting to get access token...');
    
    const credential = new ClientSecretCredential(
      process.env.OUTLOOK_TENANT_ID,
      process.env.OUTLOOK_CLIENT_ID,
      process.env.OUTLOOK_CLIENT_SECRET
    );

    // Test getting token first
    const token = await credential.getToken('https://graph.microsoft.com/.default');
    console.log('✅ Access token obtained successfully');
    console.log('Token expires:', new Date(token.expiresOnTimestamp).toISOString());
    console.log('\n');

    // Initialize Graph client
    const client = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const token = await credential.getToken('https://graph.microsoft.com/.default');
          return token.token;
        },
      },
    });

    console.log('📧 Testing Graph API with user:', process.env.OUTLOOK_USER_EMAIL);
    
    // Try to get user info first
    try {
      const user = await client.api(`/users/${process.env.OUTLOOK_USER_EMAIL}`).get();
      console.log('✅ User found:', user.displayName);
      console.log('   Email:', user.mail || user.userPrincipalName);
    } catch (userError) {
      console.error('❌ Error fetching user:', userError.message);
      console.log('\n💡 This might mean:');
      console.log('   1. The app doesn\'t have permission to read user profiles (User.Read)');
      console.log('   2. The email address is incorrect');
      console.log('   3. Admin consent is missing\n');
    }

    // Try to fetch messages
    console.log('\n📬 Attempting to fetch messages...');
    const messages = await client
      .api(`/users/${process.env.OUTLOOK_USER_EMAIL}/messages`)
      .top(1)
      .get();

    console.log('✅ Messages API works!');
    console.log('Found', messages.value?.length || 0, 'message(s)');
    
    if (messages.value && messages.value.length > 0) {
      console.log('\nLatest message:');
      console.log('  Subject:', messages.value[0].subject);
      console.log('  From:', messages.value[0].from?.emailAddress?.address);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.statusCode) {
      console.error('Status code:', error.statusCode);
    }

    if (error.body) {
      console.error('Error body:', JSON.stringify(error.body, null, 2));
    }

    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Verify app registration in Azure Portal');
    console.log('2. Check API permissions (Mail.Read, Mail.ReadWrite)');
    console.log('3. Ensure admin consent is granted');
    console.log('4. Verify the user email exists in your tenant');
    console.log('5. Check if the app has application permissions (not delegated)');
    
    process.exit(1);
  }
}

testOutlook();
