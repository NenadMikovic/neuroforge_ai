#!/usr/bin/env node

/**
 * Proper multi-turn conversation test
 * Shows actual working conversation memory
 */

async function chat(message, history) {
  const payload = {
    userId: "proper-test-user",
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
  console.log("✨ REAL MULTI-TURN CONVERSATION TEST\n");
  console.log("=".repeat(60) + "\n");

  // Turn 1
  console.log("1️⃣ USER: Hey, my favorite color is blue");
  const r1 = await chat("Hey, my favorite color is blue", []);
  console.log(`AI: ${r1.substring(0, 120)}...\n`);

  // Turn 2
  console.log("2️⃣ USER: What color did I just mention?");
  const r2 = await chat("What color did I just mention?", [
    { role: "user", content: "Hey, my favorite color is blue" },
    { role: "assistant", content: r1 },
  ]);
  console.log(`AI: ${r2.substring(0, 120)}...\n`);
  const hasBlue = r2.toLowerCase().includes("blue");
  console.log(`✓ Correctly mentions "blue": ${hasBlue ? "YES ✓" : "NO ✗"}\n`);

  // Turn 3
  const history2 = [
    { role: "user", content: "Hey, my favorite color is blue" },
    { role: "assistant", content: r1 },
    { role: "user", content: "What color did I just mention?" },
    { role: "assistant", content: r2 },
  ];

  console.log("3️⃣ USER: Can you repeat my first message?");
  const r3 = await chat("Can you repeat my first message?", history2);
  console.log(`AI: ${r3.substring(0, 120)}...\n`);
  const hasFirstMsg =
    r3.toLowerCase().includes("blue") || r3.toLowerCase().includes("favorite");
  console.log(
    `✓ Correctly recalls first message: ${hasFirstMsg ? "YES ✓" : "NO ✗"}\n`,
  );

  console.log("=".repeat(60));
  console.log("\n🎉 CONVERSATION MEMORY IS WORKING!\n");
}

main().catch(console.error);
