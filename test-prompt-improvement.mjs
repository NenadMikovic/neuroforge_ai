#!/usr/bin/env node

const tests = [
  {
    name: "Test 1: Simple greeting",
    payload: {
      userId: "test-user-" + Date.now(),
      message: "hey there",
    },
  },
  {
    name: "Test 2: Recall previous message",
    payload: null, // Will be set after first message
  },
];

async function runTest(testIndex) {
  const test = tests[testIndex];

  if (!test.payload) {
    // For test 2, use the conversation from test 1
    test.payload = {
      userId: tests[0].payload.userId,
      message: "what was my first message to you?",
      conversationHistory: [
        { id: "1", role: "user", content: "hey there" },
        { id: "2", role: "assistant", content: "Test response" },
      ],
    };
  }

  console.log(`\n📝 ${test.name}`);
  console.log(`Message: "${test.payload.message}"`);

  try {
    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(test.payload),
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

    console.log(`Response: ${fullResponse.substring(0, 200)}...`);
    return fullResponse;
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

async function main() {
  await runTest(0);
  await runTest(1);

  console.log("\n✅ Tests completed");
}

main();
