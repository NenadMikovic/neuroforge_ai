/**
 * Python Execution Tool - Sandboxed Python code execution
 */

import { spawn } from "child_process";
import type { ToolCall, ToolResult, ToolContext } from "./types";

interface PythonRuntimeCandidate {
  command: string;
  preArgs?: string[];
}

export class PythonExecutionTool {
  async execute(toolCall: ToolCall, context: ToolContext): Promise<ToolResult> {
    const startTime = performance.now();

    try {
      const params = toolCall.params as {
        code: string;
        timeout?: number;
        context?: Record<string, unknown>;
      };

      const { code, timeout = 10, context: userContext = {} } = params;

      if (!code || typeof code !== "string") {
        throw new Error("Code must be a non-empty string");
      }

      if (timeout < 1 || timeout > 60) {
        throw new Error("Timeout must be between 1 and 60 seconds");
      }

      // Validation of dangerous imports is done in validators.ts
      // But do a final check here
      this.validateCode(code);

      // Execute the code
      const result = await this.executePythonCode(
        code,
        userContext,
        timeout * 1000,
      );

      const executionTime = performance.now() - startTime;

      return {
        toolCallId: toolCall.id,
        tool: "python_exec",
        success: true,
        result,
        executionTime,
        metadata: {
          outputLength: JSON.stringify(result).length,
        },
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        toolCallId: toolCall.id,
        tool: "python_exec",
        success: false,
        error: `Python Error: ${errorMessage}`,
        executionTime,
      };
    }
  }

  private validateCode(code: string): void {
    // Check for dangerous patterns
    const forbiddenPatterns = [
      /\b(import|from)\s+(os|subprocess|sys|socket|urllib|requests)\b/i,
      /\b(__import__|exec|eval|compile|open)\s*\(/i,
      /\bglob\s*\(/i,
      /\bfile\s*\(/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        throw new Error("Code contains forbidden imports or functions");
      }
    }
  }

  private async executePythonCode(
    code: string,
    context: Record<string, unknown>,
    timeout: number,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Create a simple Python sandbox environment
      const pythonScript = this.buildSandboxedScript(code, context);

      const candidates = this.getPythonRuntimeCandidates();

      const tryCandidate = (index: number) => {
        if (index >= candidates.length) {
          reject(
            new Error(
              "No Python runtime found. Install Python and ensure 'python' or 'py' is available in PATH.",
            ),
          );
          return;
        }

        const candidate = candidates[index];
        const args = [...(candidate.preArgs || []), "-c", pythonScript];
        const child = spawn(candidate.command, args, {
          timeout,
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("error", (error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") {
            tryCandidate(index + 1);
            return;
          }
          reject(error);
        });

        child.on("close", (exitCode) => {
          if (exitCode !== 0) {
            reject(new Error(`Python execution failed: ${stderr}`));
            return;
          }

          try {
            // Try to parse as JSON if output starts with {
            if (
              stdout.trim().startsWith("{") ||
              stdout.trim().startsWith("[")
            ) {
              resolve(JSON.parse(stdout));
            } else {
              // Return as plain string
              resolve(stdout.trim());
            }
          } catch {
            resolve(stdout.trim());
          }
        });
      };

      tryCandidate(0);
    });
  }

  private getPythonRuntimeCandidates(): PythonRuntimeCandidate[] {
    const envPython = process.env.PYTHON_EXECUTABLE;
    if (envPython && envPython.trim().length > 0) {
      return [{ command: envPython.trim() }];
    }

    if (process.platform === "win32") {
      return [
        { command: "python" },
        { command: "py", preArgs: ["-3"] },
        { command: "python3" },
      ];
    }

    return [{ command: "python3" }, { command: "python" }];
  }

  private buildSandboxedScript(
    code: string,
    context: Record<string, unknown>,
  ): string {
    // Build a sandboxed environment with allowed modules
    const contextStr = JSON.stringify(context);

    const script = `
import json
import math
import re
import string
import collections
import itertools
import functools
import statistics
import datetime

# Create sandbox context
_context = json.loads('''${contextStr}''')

# Make context available as variables
for _key, _value in _context.items():
    locals()[_key] = _value

# Capture output
class _OutputCapture:
    def __init__(self):
        self.data = None
    def set(self, value):
        self.data = value

_output = _OutputCapture()

# User code execution
try:
${code
  .split("\n")
  .map((line) => "    " + line)
  .join("\n")}
except Exception as e:
    print(json.dumps({"error": str(e)}))
    exit(1)

# If code returned a value, capture it
if _output.data is not None:
  print(json.dumps(_output.data))
else:
  print(json.dumps({"output": "Code executed successfully"}))
`;

    return script;
  }
}
