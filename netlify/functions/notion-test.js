'use strict'

const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  try {
    console.log('🧪 [TEST] ========== Starting Notion connection test ==========');
    console.log('🧪 [TEST] HTTP Method:', event.httpMethod);
    console.log('🧪 [TEST] Query params:', JSON.stringify(event.queryStringParameters || {}));
    
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET,OPTIONS'
        },
        body: ''
      };
    }
    
    // Test 0: Check environment variables
    console.log('🔍 [TEST] Checking environment variables...');
    
    if (!process.env.NOTION_TOKEN) {
      console.error('❌ [TEST] NOTION_TOKEN not found');
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          step: 'env_check',
          error: 'NOTION_TOKEN not found',
          suggestion: 'Add NOTION_TOKEN to Netlify environment variables'
        })
      };
    }
    
    if (!process.env.NOTION_DATABASE_ID) {
      console.error('❌ [TEST] NOTION_DATABASE_ID not found');
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          step: 'env_check',
          error: 'NOTION_DATABASE_ID not found',
          suggestion: 'Add NOTION_DATABASE_ID to Netlify environment variables'
        })
      };
    }
    
    console.log('✅ [TEST] Environment variables found');
    console.log('🔍 [TEST] Token exists:', !!process.env.NOTION_TOKEN);
    console.log('🔍 [TEST] Token length:', process.env.NOTION_TOKEN ? process.env.NOTION_TOKEN.length : 0);
    console.log('🔍 [TEST] Database ID exists:', !!process.env.NOTION_DATABASE_ID);
    console.log('🔍 [TEST] Database ID raw:', process.env.NOTION_DATABASE_ID.substring(0, 20) + '...');
    
    // Initialize Notion client
    console.log('🔑 [TEST] Initializing Notion client...');
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: '2025-09-03'
    });
    console.log('✅ [TEST] Notion client initialized');
    
    // Test 1: Get current user (tests token validity)
    console.log('🔑 [TEST] Test 1: Validating token...');
    try {
      const user = await notion.users.me();
      console.log('✅ [TEST] Token is valid');
      console.log('📊 [TEST] User info:', {
        id: user.id,
        name: user.name || 'No name',
        type: user.type
      });
    } catch (tokenError) {
      console.error('❌ [TEST] Token validation failed:', tokenError.message);
      console.error('❌ [TEST] Error code:', tokenError.code);
      console.error('❌ [TEST] Error status:', tokenError.status);
      
      return {
        statusCode: 401,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          step: 'token_validation',
          error: `Invalid token: ${tokenError.message}`,
          error_code: tokenError.code,
          error_status: tokenError.status,
          suggestion: 'Verify that NOTION_TOKEN is correct and not expired'
        })
      };
    }
    
    // Test 2: Format and validate database ID
    console.log('🔍 [TEST] Test 2: Formatting database ID...');
    const rawDbId = process.env.NOTION_DATABASE_ID;
    console.log('🔍 [TEST] Raw DB ID:', rawDbId);
    console.log('🔍 [TEST] Raw DB ID length:', rawDbId.length);
    
    // Remove spaces and dashes for validation
    const cleanId = rawDbId.replace(/[\s-]/g, '');
    console.log('🔍 [TEST] Clean ID (no dashes):', cleanId);
    console.log('🔍 [TEST] Clean ID length:', cleanId.length);
    
    // Validate length
    if (cleanId.length !== 32) {
      console.error('❌ [TEST] Invalid database ID length:', cleanId.length);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          step: 'database_id_format',
          error: `Invalid database ID length: ${cleanId.length} (expected 32 characters)`,
          raw_id: rawDbId.substring(0, 20) + '...',
          clean_id_length: cleanId.length,
          suggestion: 'Database ID should be 32 hexadecimal characters (with or without dashes)'
        })
      };
    }
    
    // Validate hexadecimal
    if (!/^[0-9a-fA-F]{32}$/.test(cleanId)) {
      console.error('❌ [TEST] Invalid hexadecimal characters in database ID');
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          step: 'database_id_format',
          error: 'Database ID contains invalid characters (must be hexadecimal)',
          raw_id: rawDbId.substring(0, 20) + '...',
          suggestion: 'Database ID should only contain 0-9 and a-f characters'
        })
      };
    }
    
    // Format as UUID (8-4-4-4-12)
    let dbId;
    if (rawDbId.includes('-')) {
      // Already has dashes, use as-is if valid format
      if (rawDbId.length === 36 && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(rawDbId)) {
        dbId = rawDbId;
        console.log('✅ [TEST] Database ID already in correct UUID format');
      } else {
        // Has dashes but wrong format, reformat
        dbId = cleanId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
        console.log('⚠️ [TEST] Database ID had dashes but wrong format, reformatted');
      }
    } else {
      // No dashes, add them
      dbId = cleanId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
      console.log('✅ [TEST] Database ID formatted to UUID format');
    }
    
    console.log('✅ [TEST] Formatted DB ID:', dbId);
    console.log('✅ [TEST] Formatted DB ID length:', dbId.length);
    
    // Test 3: Try to retrieve database info
    console.log('🗄️ [TEST] Test 3: Attempting to retrieve database...');
    try {
      const dbInfo = await notion.databases.retrieve({
        database_id: dbId
      });
      
      console.log('✅ [TEST] Database retrieved successfully');
      console.log('📋 [TEST] Database info:', {
        id: dbInfo.id,
        title: dbInfo.title?.[0]?.plain_text || 'No title',
        properties_count: Object.keys(dbInfo.properties || {}).length,
        created_time: dbInfo.created_time,
        last_edited_time: dbInfo.last_edited_time
      });
      
      // List some property names for debugging
      const propertyNames = Object.keys(dbInfo.properties || {}).slice(0, 10);
      console.log('📋 [TEST] Sample properties:', propertyNames);
      
      return {
        statusCode: 200,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          message: 'All tests passed!',
          tests: {
            token: {
              status: 'valid',
              user_id: (await notion.users.me()).id
            },
            database_id_format: {
              status: 'valid',
              raw: rawDbId.substring(0, 20) + '...',
              formatted: dbId,
              length: dbId.length
            },
            database_access: {
              status: 'success',
              database_id: dbInfo.id,
              database_title: dbInfo.title?.[0]?.plain_text || 'No title',
              properties_count: Object.keys(dbInfo.properties || {}).length,
              sample_properties: propertyNames
            }
          },
          api_version: '2025-09-03'
        })
      };
      
    } catch (dbError) {
      console.error('❌ [TEST] Database access failed:', dbError.message);
      console.error('❌ [TEST] Error code:', dbError.code);
      console.error('❌ [TEST] Error status:', dbError.status);
      console.error('❌ [TEST] Error body:', dbError.body);
      
      // Determine possible issues based on error code
      let possibleIssues = [];
      if (dbError.code === 'object_not_found') {
        possibleIssues = [
          'Database ID is incorrect',
          'Database was deleted or moved',
          'Database ID format is wrong'
        ];
      } else if (dbError.code === 'unauthorized') {
        possibleIssues = [
          'Integration not added to this database',
          'Integration does not have access',
          'Database permissions are insufficient'
        ];
      } else {
        possibleIssues = [
          'Database ID is incorrect',
          'Integration not added to this database',
          'Database was deleted or moved',
          'Insufficient permissions',
          'API version mismatch'
        ];
      }
      
      return {
        statusCode: 400,
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          step: 'database_access',
          error: dbError.message,
          error_code: dbError.code,
          error_status: dbError.status,
          error_body: dbError.body,
          database_id_tested: dbId,
          database_id_raw: rawDbId.substring(0, 20) + '...',
          possible_issues: possibleIssues,
          suggestions: [
            '1. Verify Database ID is correct (copy from Notion database URL)',
            '2. In Notion, go to database → "..." → "Add connections" → Add your integration',
            '3. Check if database was moved or deleted',
            '4. Verify integration has proper permissions'
          ]
        })
      };
    }
    
  } catch (error) {
    console.error('❌ [TEST] Unexpected error:', error);
    console.error('❌ [TEST] Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        step: 'unexpected_error',
        error: error.message,
        error_type: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

