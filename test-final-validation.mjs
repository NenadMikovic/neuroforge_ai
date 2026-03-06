#!/usr/bin/env node

async function chat(message, history) {
  const payload = {
    userId: "final-test-user-" + Date.now(),
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
  console.log("🎯 FINAL CONVERSATION MEMORY VALIDATION\n");

  // Test sequence matching user's original issue
  console.log("1️⃣ USER: hey");
  const r1 = await chat("hey", []);
  console.log(`AI: ${r1.substring(0, 100)}...\n`);

  console.log("2️⃣ USER: what was my last question");
  const r2 = await chat("what was my last question", [
    { role: "user", content: "hey" },
    { role: "assistant", content: r1 },
  ]);
  console.log(`AI: ${r2.substring(0, 100)}...\n`);
  const containsHey = r2.toLowerCase().includes("hey");
  console.log(`✓ References "hey": ${containsHey ? "YES ✓" : "NO ✗"}\n`);

  // Build history
  const history2 = [
    { role: "user", content: "hey" },
    { role: "assistant", content: r1 },
    { role: "user", content: "what was my last question" },
    { role: "assistant", content: r2 },
  ];

  console.log("3️⃣ USER: Do you have any memory");
  const r3 = await chat("Do you have any memory", history2);
  console.log(`AI: ${r3.substring(0, 100)}...\n`);

  const history3 = [
    ...history2,
    { role: "user", content: "Do you have any memory" },
    { role: "assistant", content: r3 },
  ];

  console.log("4️⃣ USER: okay repeat my last message");
  const r4 = await chat("okay repeat my last message", history3);
  console.log(`AI: ${r4.substring(0, 100)}...\n`);
  const containsMemory = r4.toLowerCase().includes("memory");
  console.log(`✓ References memory: ${containsMemory ? "YES ✓" : "NO ✗"}\n`);

  console.log("=".repeat(60));
  if (containsHey && containsMemory) {
    console.log("🎉 SUCCESS! Conversation memory fully working!\n");
  } else {
    console.log("⚠️ Some issues remain with memory recall\n");
  }
}

main().catch(console.error);
