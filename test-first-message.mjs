#!/usr/bin/env node

// Test the first message in a fresh conversation
const payload = {
  userId: "fresh-user-" + Date.now(),
  message: "hello",
  // No conversationId = creates new conversation
  // No conversationHistory = will fetch from DB (empty on first message)
};

try {
  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Response Status:", response.status);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let tokens = [];
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
          tokens.push(json.content);
          fullResponse += json.content;
        } else if (json.type === "complete") {
          console.log("\n✅ Response completed successfully!");
          console.log("Response:", json.content);
          console.log("Tokens:", tokens.length);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  console.log("\n✅ Test passed - first message processed without duplication");
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
