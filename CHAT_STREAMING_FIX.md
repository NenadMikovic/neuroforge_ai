# Chat Token Consumption Issue - Fixed

## Problem Identified

The `/chat` endpoint was consuming tokens from the LLM but not properly returning responses to the client. This was caused by an issue in the streaming implementation.

## Root Cause

In `lib/llm/ollama.ts`, the `streamChatCompletion` generator function was using:

```typescript
for await (const chunk of response.data)
```

This pattern doesn't work correctly with axios streams in Node.js. When axios returns a response with `responseType: "stream"`, the `response.data` is a Node.js stream object that cannot be reliably iterated using `for await...of`. This caused the streaming to hang indefinitely while tokens were being consumed from Ollama.

## Solution Applied

Replaced the `for await` iteration with proper Node.js stream event handling:

1. **Set up event listeners** on `response.data`:
   - `on('data')` - Processes streamed chunks
   - `on('end')` - Signals when stream is complete
   - `on('error')` - Captures stream errors

2. **Use a token queue** - Events push tokens into a queue as they arrive
3. **Yield tokens in generator** - The generator yields tokens as they become available while waiting for the stream to complete
4. **Proper timeout** - Increased timeout from 60s to 120s for longer responses
5. **Error handling** - Errors are captured and thrown after stream completes

## Changes Made

- **File**: `lib/llm/ollama.ts`
- **Function**: `streamChatCompletion`
- **Lines**: ~30-115

### Key Implementation Details:

```typescript
// Token queue to buffer incoming tokens
const tokenQueue: string[] = [];
let streamDone = false;
let streamError: Error | null = null;

// Event listeners for proper stream handling
response.data.on("data", (chunk: Buffer) => {
  // Parse JSON lines and collect tokens
  tokenQueue.push(token);
});

response.data.on("end", () => {
  streamDone = true;
});

// Generator yields tokens as they arrive
while (!streamDone || tokenIndex < tokenQueue.length) {
  if (tokenIndex < tokenQueue.length) {
    yield tokenQueue[tokenIndex];
    tokenIndex++;
  } else if (!streamDone) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
```

## How This Fixes the Issue

1. **Tokens are now properly consumed** - The stream events capture all tokens from Ollama
2. **Generator properly yields** - Tokens are yielded as they arrive, allowing the `/api/chat` route to send them to the client
3. **Stream completion is tracked** - The generator knows when the stream is complete and stops waiting
4. **No more hanging** - The response properly completes instead of hanging indefinitely
5. **Better error handling** - Stream errors are properly captured and reported

## Testing

To verify the fix works:

1. Open `/chat` page
2. Send a message
3. You should see the response streaming in real-time
4. The response should complete without hanging

## Related Code

- `/api/chat/route.ts` - Uses `streamChatCompletion()` in ReadableStream
- `/app/components/ChatWindow.tsx` - Client-side streaming handler that consumes the API stream
- `/lib/services/chatService.ts` - Frontend service that initiates chat requests
