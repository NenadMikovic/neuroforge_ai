#!/usr/bin/env node

/**
 * Check what documents are indexed and their chunk count
 */

async function checkDocuments() {
  console.log("📄 Checking indexed documents...\n");

  // First, let's check one of the debug endpoints
  try {
    const response = await fetch("http://localhost:3000/api/debug/rag", {
      method: "GET",
    });

    if (!response.ok) {
      console.log(`API returned status ${response.status}`);
      return;
    }

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    console.log("\nMake sure the dev server is running on port 3000");
  }
}

checkDocuments();
