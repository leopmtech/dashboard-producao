'use strict'

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      success: true,
      message: "Function funcionando!",
      timestamp: new Date().toISOString(),
      hasNotionKey: !!process.env.NOTION_API_KEY,
      hasDbId: !!process.env.NOTION_DATABASE_ID,
      nodeVersion: process.version
    })
  };
};


