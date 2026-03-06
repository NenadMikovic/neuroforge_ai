#!/usr/bin/env node

/**
 * Direct test of Ollama to see if multi-turn conversations work correctly
 */

async function testOllamaDirectly() {
  const messages = [
    {
      role: "system",
      content: "You are a helpful assistant. Read the conversation carefully.",
    },
    { role: "user", content: "My name is Alice and I like cats" },
    {
      role: "assistant",
      content: "Nice to meet you, Alice! It's great that you like cats.",
    },
    { role: "user", content: "What is my name?" },
  ];

  console.log("🧪 Testing Ollama Direct Multi-Turn Conversation\n");
  console.log("Messages being sent:");
  messages.forEach((m, i) => {
    console.log(`  [${i}] ${m.role}: ${m.content}`);
  });
  console.log("");

  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error(`Ollama error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const data = await response.json();
    console.log("✅ Ollama Response:");
    console.log(`   "${data.message.content}"`);

    // Check if the response correctly identified Alice as the user's name
    if (data.message.content.toLowerCase().includes("alice")) {
      console.log("\n✓ SUCCESS: Ollama correctly remembered the user's name");
    } else {
      console.log("\n✗ FAILURE: Ollama did not correctly reference 'Alice'");
      console.log(
        "   This suggests Mistral may not be suited for multi-turn conversations",
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testOllamaDirectly();
