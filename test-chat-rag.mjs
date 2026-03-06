#!/usr/bin/env node

/**
 * Test if RAG is working in chat API
 */

async function testChatWithRAG() {
  console.log("🧪 Testing RAG in Chat API\n");

  const payload = {
    userId: "08a0f86f-93ab-4e92-9aaf-b60b2dca718c",
    message: "What is the title of the PDF document I have uploaded?",
    enableRAG: true,
  };

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("📤 Request sent to /api/chat");
    console.log(`    enableRAG: ${payload.enableRAG}`);
    console.log(`    Message: "${payload.message}"\n`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let msgCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((l) => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.type === "token") {
            fullResponse += json.content;
          } else if (json.type === "complete") {
            msgCount = json.tokens || 0;
          }
        } catch (e) {
          // Ignore
        }
      }
    }

    console.log(`✅ Response received (${msgCount} tokens):\n`);
    console.log(fullResponse);

    // Check if it mentioned PDF or document title
    if (
      fullResponse.toLowerCase().includes("pdf") ||
      fullResponse.toLowerCase().includes("document")
    ) {
      console.log("\n✓ Response mentions PDF/document - RAG may be working!");
    } else {
      console.log(
        "\n✗ Response doesn't mention PDF/document - RAG might not be returning results",
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testChatWithRAG();
