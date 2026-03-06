#!/usr/bin/env node

/**
 * Test with detailed server log inspection
 * This will show exactly what messages are being sent to Ollama
 */

async function testChat(payload, testName) {
  console.log(`\n📝 ${testName}`);
  console.log(`Payload: ${JSON.stringify(payload)}`);

  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";

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
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  console.log(
    `Response (first 150 chars): ${fullResponse.substring(0, 150)}...`,
  );
  return fullResponse;
}

async function main() {
  console.log("🧪 Testing Chat Messages Format\n");
  console.log("CHECK THE SERVER CONSOLE FOR 'FULL MESSAGE ARRAY' LOGS");
  console.log(
    "This test sends messages in the SAME way Ollama direct test worked.",
  );

  // Test 1: First message
  const response1 = await testChat(
    { userId: "test-" + Date.now(), message: "My name is Bob" },
    "Test 1: Initial message",
  );

  // Small delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test 2: Second message asking to recall
  const response2 = await testChat(
    {
      userId: "test-" + Date.now(),
      message: "What is my name",
      conversationHistory: [
        { role: "user", content: "My name is Bob" },
        { role: "assistant", content: response1 },
      ],
    },
    "Test 2: Recall previous message",
  );

  console.log("\n✓ Check server logs above for 'FULL MESSAGE ARRAY' output");
  console.log("Look for the messages array structure that was sent to Ollama");
}

main().catch(console.error);
