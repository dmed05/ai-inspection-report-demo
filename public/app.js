const output = document.querySelector("#output");
document.querySelector("#load").addEventListener("click", async () => {
  output.textContent = "Loading…";
  const response = await fetch("/api/demo/reports");
  const { reports } = await response.json();
  const report = reports[0];
  const items = report.findings
    .map(
      (finding) =>
        `<li><strong>${finding.title}</strong>: ${finding.detail}</li>`
    )
    .join("");
  output.innerHTML = `
    <article>
      <small>${report.location}</small>
      <h2>${report.businessName}</h2>
      <p>${report.summary}</p>
      <ul>${items}</ul>
    </article>`;
});
