#!/usr/bin/env node

const payload = {
  userId: "test-user",
  conversationId: "test-conv",
  message: "what was my question about ML?",
  conversationHistory: [
    { role: "user", content: "Tell me about machine learning" },
    {
      role: "assistant",
      content:
        "Machine learning is a subset of AI that enables systems to learn and improve from experience. It uses algorithms to find patterns in data and make predictions or decisions without being explicitly programmed.",
    },
    { role: "user", content: "what was my question about ML?" },
  ],
};

try {
  const response = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Response Status:", response.status);
  console.log("Response Headers:", Object.fromEntries(response.headers));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    fullText += chunk;
    console.log("Chunk:", chunk);
  }

  console.log("\n=== FULL RESPONSE ===");
  console.log(fullText);
} catch (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
