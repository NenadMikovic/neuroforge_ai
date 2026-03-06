/**
 * Security Service
 * Detects prompt injections and validates outputs
 */

import { prisma } from "@/lib/db/service";

export interface SecurityCheck {
  passed: boolean;
  threatType?: string;
  severity?: "low" | "medium" | "high" | "critical";
  description?: string;
  suspicious_content?: string;
}

export class SecurityService {
  /**
   * Prompt injection detection patterns
   */
  private static readonly INJECTION_PATTERNS = [
    /\b(ignore|forget|disregard)\s+(previous|prior|above|all)\s+(instruction|prompt|rule)/i,
    /\b(system|admin|developer)\s+prompt/i,
    /(^|\s)(you are|you will|behave as|act as|pretend to be|roleplay as).*(system|admin|developer|attacker|hacker)/i,
    /reveal\s+(system\s+)?(prompt|instruction)/i,
    /what.*(is|was).*(your)?\s*(system\s+)?(prompt|instruction)/i,
    /print\s+(system\s+)?(prompt|instruction|secret)/i,
    /execute\s+(python|code|sql)\s+for|run\s+this\s+code/i,
    /\[SYSTEM\]|\<SYSTEM\>|###SYSTEM/i,
    /\[JAILBREAK\]|\<JAILBREAK\>/i,
    /mode:\s*dev|debug_mode|admin_mode/i,
  ];

  /**
   * Sensitive output patterns to block
   */
  private static readonly SENSITIVE_OUTPUT_PATTERNS = [
    /SYSTEM\s*PROMPT|SYSTEM\s*INSTRUCTION/i,
    /You\s+are\s+[a-zA-Z0-9\s]+\s+assistant/i,
    /(Your|You)\s+role\s+is|behave\s+as|act\s+as/i,
  ];

  /**
   * Detect prompt injection attempts
   */
  static detectPromptInjection(input: string): SecurityCheck {
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return {
          passed: false,
          threatType: "prompt_injection",
          severity: "high",
          description: `Detected potential prompt injection: ${pattern.source}`,
          suspicious_content: input.substring(0, 200), // Log first 200 chars
        };
      }
    }

    return { passed: true };
  }

  /**
   * Validate output to prevent system prompt leakage
   */
  static validateOutput(output: string): SecurityCheck {
    for (const pattern of this.SENSITIVE_OUTPUT_PATTERNS) {
      if (pattern.test(output)) {
        // Sanitize output
        const sanitized = output.replace(pattern, "[REDACTED]");

        return {
          passed: false,
          threatType: "output_validation_failed",
          severity: "medium",
          description: "Output contains system prompt information",
          suspicious_content: output.substring(0, 200),
        };
      }
    }

    return { passed: true };
  }

  /**
   * Prevent tool JSON exposure
   */
  static validateToolOutput(output: string): SecurityCheck {
    // Check if output contains internal tool definitions
    if (
      output.includes("getToolDefinitions") ||
      output.includes("ToolDefinition") ||
      output.includes("toolInstances")
    ) {
      return {
        passed: false,
        threatType: "tool_exposure",
        severity: "medium",
        description: "Output contains internal tool system information",
      };
    }

    // Check for exposed internal endpoints
    if (/\/(api\/tools|lib\/tools)/.test(output)) {
      return {
        passed: false,
        threatType: "internal_endpoint_exposure",
        severity: "low",
        description: "Output may contain internal API paths",
      };
    }

    return { passed: true };
  }

  /**
   * Combined security check
   */
  static performSecurityCheck(input: string, output?: string): SecurityCheck {
    // Check input for injection
    const inputCheck = this.detectPromptInjection(input);
    if (!inputCheck.passed) {
      return inputCheck;
    }

    // Check output if provided
    if (output) {
      const outputCheck = this.validateOutput(output);
      if (!outputCheck.passed) {
        return outputCheck;
      }

      const toolCheck = this.validateToolOutput(output);
      if (!toolCheck.passed) {
        return toolCheck;
      }
    }

    return { passed: true };
  }

  /**
   * Log security incident
   */
  static async logSecurityIncident(
    userId: string,
    check: SecurityCheck,
    conversationId?: string,
    action_taken: string = "logged",
  ): Promise<void> {
    try {
      await (prisma as any).securityAuditLog?.create({
        data: {
          userId,
          conversationId,
          threatType: check.threatType || "unknown",
          severity: check.severity || "low",
          description: check.description || "Security check failed",
          suspicious_input: check.suspicious_content?.substring(0, 500),
          action_taken,
          is_blocked: action_taken === "blocked",
          metadata: JSON.stringify({
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (error) {
      console.error("[SecurityService] Failed to log incident:", error);
    }
  }

  /**
   * Sanitize output by removing sensitive information
   */
  static sanitizeOutput(output: string): string {
    let sanitized = output;

    // Remove system prompt indicators
    sanitized = sanitized.replace(
      /SYSTEM\s*PROMPT[^\n]*/gi,
      "[REDACTED_SYSTEM_PROMPT]",
    );
    sanitized = sanitized.replace(
      /SYSTEM\s*INSTRUCTION[^\n]*/gi,
      "[REDACTED_SYSTEM_INSTRUCTION]",
    );

    // Remove role assignments
    sanitized = sanitized.replace(
      /You\s+are\s+[a-zA-Z0-9\s]+\s+assistant/gi,
      "[REDACTED_ROLE]",
    );

    // Remove internal paths
    sanitized = sanitized.replace(/\/lib\/tools\//g, "[REDACTED_PATH]");
    sanitized = sanitized.replace(/\/api\/tools\//g, "[REDACTED_PATH]");

    return sanitized;
  }

  /**
   * Detect suspicious API key patterns in output
   */
  static detectSuspiciousSecrets(output: string): boolean {
    const patterns = [
      /sk-[a-zA-Z0-9]{32,}/g, // OpenAI keys
      /Bearer\s+[a-zA-Z0-9_.-]+/g, // Bearer tokens
      /password\s*[:=]/i,
      /api[_-]?key\s*[:=]/i,
      /secret\s*[:=]/i,
    ];

    return patterns.some((pattern) => pattern.test(output));
  }
}
