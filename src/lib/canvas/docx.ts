import type { CanvasDocument } from "./documents";

export async function exportDocumentToDocx(document: CanvasDocument | null) {
  if (!document || typeof window === "undefined") {
    return;
  }

  const [{ Document, HeadingLevel, Packer, Paragraph, TextRun }, { saveAs }] = await Promise.all([
    import("docx"),
    import("file-saver"),
  ]);

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      text: document.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    }),
  ];

  document.content.forEach((section) => {
    if (section.heading) {
      children.push(
        new Paragraph({
          text: section.heading,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 220, after: 120 },
        })
      );
    }

    if (section.meta) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.meta,
              italics: true,
              color: "666666",
              size: 20,
            }),
          ],
        })
      );
    }

    section.body
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .forEach((line) => {
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 100 },
          })
        );
      });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle = document.title?.trim().replace(/\s+/g, "_") || "document";
  saveAs(blob, `${safeTitle}.docx`);
}
