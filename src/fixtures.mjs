export const fixtureReports = Object.freeze([
  {
    id: "demo-cafe-001",
    businessName: "Northstar Demo Cafe",
    location: "100 Example Avenue",
    createdAt: "2026-06-01T16:00:00.000Z",
    summary:
      "Synthetic walkthrough completed. Two maintenance items were identified for human review.",
    findings: [
      {
        severity: "medium",
        title: "Service label requires review",
        detail: "The fixture label date is intentionally shown as overdue."
      },
      {
        severity: "low",
        title: "Access area should remain clear",
        detail: "A synthetic storage box is shown near the service area."
      }
    ]
  }
]);

export function generateFixtureReport(input = {}) {
  const businessName =
    typeof input.businessName === "string" && input.businessName.trim()
      ? input.businessName.trim().slice(0, 80)
      : "Synthetic Demo Location";

  return {
    id: `preview-${Date.now()}`,
    businessName,
    location: "Synthetic data only",
    createdAt: new Date().toISOString(),
    summary:
      "Fixture analysis completed without calling an external AI service.",
    findings: fixtureReports[0].findings
  };
}
