/**
 * Security Middleware
 * Validates requests and responses for prompt injection and other threats
 */

import { NextRequest, NextResponse } from "next/server";
import { SecurityService } from "@/lib/services/securityService";
import { prisma } from "@/lib/db/service";

export class SecurityMiddleware {
  /**
   * Check incoming request for security threats
   * Returns NextResponse if blocked, null if allowed
   */
  static async validateRequest(
    req: NextRequest,
    userId: string = "anonymous",
    conversationId: string = "unknown",
  ): Promise<NextResponse | null> {
    try {
      let requestData = "";

      // Extract request body
      if (req.method === "POST" || req.method === "PUT") {
        const cloned = req.clone();
        requestData = await cloned.text();
      } else {
        requestData = req.nextUrl.search;
      }

      // Check for prompt injection
      const injectionCheck = SecurityService.detectPromptInjection(requestData);
      if (!injectionCheck.passed) {
        // Log security incident (non-blocking)
        prisma.securityAuditLog
          ?.create({
            data: {
              userId,
              conversationId,
              threatType: injectionCheck.threatType || "prompt_injection",
              severity: injectionCheck.severity || "high",
              description:
                injectionCheck.description || "Prompt injection detected",
              suspicious_input: requestData.substring(0, 500),
              action_taken: "blocked",
              is_blocked: true,
              metadata: JSON.stringify({
                pattern: injectionCheck.description,
              }),
            },
          })
          .catch((err) =>
            console.warn("[Security] Failed to log injection attempt:", err),
          );

        return NextResponse.json(
          {
            error: "Security validation failed",
            message: "Request contains potentially malicious content",
          },
          { status: 403 },
        );
      }

      // Check for suspicious secrets
      const hasSecrets = SecurityService.detectSuspiciousSecrets(requestData);
      if (hasSecrets) {
        // Log but don't necessarily block (non-blocking)
        prisma.securityAuditLog
          ?.create({
            data: {
              userId,
              conversationId,
              threatType: "suspicious_secrets",
              severity: "medium",
              description: "Detected potential secrets in request",
              suspicious_input: requestData.substring(0, 500),
              action_taken: "logged",
              is_blocked: false,
              metadata: JSON.stringify({
                detectionType: "secrets",
              }),
            },
          })
          .catch((err) =>
            console.warn("[Security] Failed to log secrets detection:", err),
          );
      }

      return null; // Request is allowed
    } catch (error) {
      console.error("Error in security validation:", error);
      return null; // Fail open to not break functionality
    }
  }

  /**
   * Check outgoing response for security issues
   * Returns sanitized response if issues found
   */
  static async validateResponse(
    response: string | object,
    userId: string = "anonymous",
    conversationId: string = "unknown",
  ): Promise<{
    sanitized: string | object;
    blocked: boolean;
    issues: string[];
  }> {
    try {
      let responseText =
        typeof response === "string" ? response : JSON.stringify(response);

      const issues: string[] = [];
      let sanitized = responseText;

      // Validate output for system prompt leakage
      const outputValidationCheck =
        SecurityService.validateOutput(responseText);
      if (!outputValidationCheck.passed) {
        issues.push(
          outputValidationCheck.description || "Output validation failed",
        );
        sanitized = SecurityService.sanitizeOutput(responseText);

        // Log incident (non-blocking)
        prisma.securityAuditLog
          ?.create({
            data: {
              userId,
              conversationId,
              threatType:
                outputValidationCheck.threatType || "system_prompt_leakage",
              severity: outputValidationCheck.severity || "high",
              description:
                outputValidationCheck.description ||
                "Output contains system instructions",
              action_taken: "sanitized",
              is_blocked: false,
              metadata: JSON.stringify({
                issues: issues,
              }),
            },
          })
          .catch((err) =>
            console.warn(
              "[Security] Failed to log output validation incident:",
              err,
            ),
          );
      }

      return {
        sanitized:
          typeof response === "object" ? JSON.parse(sanitized) : sanitized,
        blocked: false,
        issues,
      };
    } catch (error) {
      console.error("Error validating response:", error);
      return {
        sanitized: response,
        blocked: false,
        issues: [],
      };
    }
  }

  /**
   * Perform complete security check on request
   */
  static async performSecurityCheck(
    input: string,
    userId: string = "anonymous",
    conversationId: string = "unknown",
  ): Promise<{
    passed: boolean;
    threats: Array<{ type: string; severity: string; description: string }>;
  }> {
    const threats: Array<{
      type: string;
      severity: string;
      description: string;
    }> = [];

    try {
      // Check for prompt injection
      const injectionCheck = SecurityService.detectPromptInjection(input);
      if (!injectionCheck.passed) {
        threats.push({
          type: injectionCheck.threatType || "prompt_injection",
          severity: injectionCheck.severity || "high",
          description:
            injectionCheck.description || "Prompt injection detected",
        });
      }

      // Check for secrets
      const hasSecrets = SecurityService.detectSuspiciousSecrets(input);
      if (hasSecrets) {
        threats.push({
          type: "suspicious_secrets",
          severity: "medium",
          description: "Detected potential secrets in input",
        });
      }

      // Log threats
      if (threats.length > 0) {
        for (const threat of threats) {
          await prisma.securityAuditLog.create({
            data: {
              userId,
              conversationId,
              threatType: threat.type,
              severity: threat.severity as
                | "low"
                | "medium"
                | "high"
                | "critical",
              description: threat.description,
              suspicious_input: input.substring(0, 500),
              action_taken: "logged",
              is_blocked: false,
              metadata: JSON.stringify({
                detectionTime: new Date().toISOString(),
              }),
            },
          });
        }
      }

      return {
        passed: threats.length === 0,
        threats,
      };
    } catch (error) {
      console.error("Error performing security check:", error);
      return {
        passed: false,
        threats: [
          {
            type: "security_check_error",
            severity: "low",
            description: "Security check could not be completed",
          },
        ],
      };
    }
  }

  /**
   * Get rate limit key for user
   */
  static getRateLimitKey(userId: string, endpoint: string): string {
    return `rl:${userId}:${endpoint}`;
  }

  /**
   * Check if request should be rate limited
   */
  static async checkRateLimit(
    userId: string,
    endpoint: string,
    maxRequests: number = 100,
    windowSeconds: number = 60,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    // This would integrate with a rate limiting service
    // For now, return success
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }
}
