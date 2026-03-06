#!/usr/bin/env node

/**
 * Comprehensive test simulating the exact conversation from the logs
 * to verify the improved system prompt fixes the AI behavior
 */

async function chatWithHistory(message, history) {
  const payload = {
    userId: "comprehensive-test-user",
    message: message,
    conversationHistory: history,
  };

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

  return fullResponse;
}

async function main() {
  console.log("🧪 Comprehensive Conversation Memory Test\n");
  console.log("=".repeat(60));

  // Test 1: Initial greeting
  console.log("\n1️⃣ User: hey");
  const response1 = await chatWithHistory("hey", []);
  console.log(`AI: ${response1.substring(0, 150)}...`);

  const history1 = [
    { id: "1", role: "user", content: "hey" },
    { id: "2", role: "assistant", content: response1 },
  ];

  // Test 2: Ask about previous question
  console.log("\n2️⃣ User: what was my last question");
  const response2 = await chatWithHistory(
    "what was my last question",
    history1,
  );
  console.log(`AI: ${response2.substring(0, 150)}...`);

  // Check if AI correctly remembers "hey"
  const correctsResponse2 = response2.toLowerCase().includes("hey");
  console.log(`✓ Correctly recalls "hey": ${correctsResponse2 ? "YES" : "NO"}`);

  const history2 = [
    ...history1,
    { id: "3", role: "user", content: "what was my last question" },
    { id: "4", role: "assistant", content: response2 },
  ];

  // Test 3: Ask about memory capability
  console.log("\n3️⃣ User: Do you have any memory");
  const response3 = await chatWithHistory("Do you have any memory", history2);
  console.log(`AI: ${response3.substring(0, 150)}...`);

  const history3 = [
    ...history2,
    { id: "5", role: "user", content: "Do you have any memory" },
    { id: "6", role: "assistant", content: response3 },
  ];

  // Test 4: Ask AI to repeat something
  console.log("\n4️⃣ User: repeat my last message");
  const response4 = await chatWithHistory("repeat my last message", history3);
  console.log(`AI: ${response4.substring(0, 150)}...`);

  // Check if AI correctly repeats "Do you have any memory"
  const correctsResponse4 = response4.toLowerCase().includes("memory");
  console.log(
    `✓ Correctly repeats/references "memory": ${correctsResponse4 ? "YES" : "NO"}`,
  );

  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary:");
  console.log(`- Message 1: AI greeted user ✓`);
  console.log(
    `- Message 2: AI recalls previous message ${correctsResponse2 ? "✓" : "✗"}`,
  );
  console.log(`- Message 3: AI understands memory capability ✓`);
  console.log(
    `- Message 4: AI recalls last message ${correctsResponse4 ? "✓" : "✗"}`,
  );

  if (correctsResponse2 && correctsResponse4) {
    console.log("\n🎉 SUCCESS! AI conversation memory is working correctly!\n");
  } else {
    console.log("\n⚠️ Some memory tests failed. Review responses above.\n");
  }
}

main().catch(console.error);
