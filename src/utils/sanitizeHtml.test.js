/* @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { sanitizeProductDescription } from "./sanitizeHtml";

describe("sanitizeProductDescription", () => {
  it("keeps CKEditor formatting used by product descriptions", () => {
    const html = [
      "<h2>Heading</h2>",
      "<ul><li><strong>Bold</strong> and <em>italic</em></li></ul>",
      '<p><a href="https://example.com">Link</a></p>',
    ].join("");

    const sanitized = sanitizeProductDescription(html);

    expect(sanitized).toContain("<h2>Heading</h2>");
    expect(sanitized).toContain("<ul><li><strong>Bold</strong> and <em>italic</em></li></ul>");
    expect(sanitized).toContain('<a href="https://example.com">Link</a>');
  });

  it("removes executable tags, handlers, styles and javascript URLs", () => {
    const dirtyHtml = [
      '<h2 onclick="alert(1)">Safe heading</h2>',
      '<img src="x" onerror="alert(1)" onload="alert(1)">',
      '<a href="javascript:alert(1)">Unsafe link</a>',
      "<script>alert(1)</script><iframe srcdoc='<script>alert(1)</script>'></iframe>",
      "<object></object><embed><style>body{display:none}</style><svg onload='alert(1)'></svg>",
    ].join("");

    const sanitized = sanitizeProductDescription(dirtyHtml);

    expect(sanitized).toContain("Safe heading");
    expect(sanitized).toContain("Unsafe link");
    expect(sanitized).not.toMatch(/script|iframe|object|embed|style|svg/i);
    expect(sanitized).not.toMatch(/onclick|onerror|onload|javascript:/i);
  });
});
